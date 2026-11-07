import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config, prisma } from './config/index.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { schedulerService } from './services/scheduler.service.js';

const app = express();

// Middlewares de Segurança e Monitoramento
app.use(helmet({
  crossOriginResourcePolicy: false
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Rate limiting para prevenção de ataques de força bruta no login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // máximo 30 tentativas por IP
  message: { error: 'Muitas tentativas de acesso. Tente novamente mais tarde.' }
});
app.use('/api/auth/login', authLimiter);

// Rota de Health Check
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Rotas da API
app.use('/api', routes);

// Rota direta de conveniência POST /send-message (sem prefixo /api)
app.post('/send-message', (req, res, next) => {
  // Redireciona para o handler do whatsAppController
  import('./controllers/whatsapp.controller.js')
    .then(m => m.whatsAppController.sendMessage(req, res))
    .catch(next);
});

// Middleware Global de Tratamento de Erros
app.use(errorHandler);

// Inicialização do Servidor
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`🚀 Sistema de Cobrança WhatsApp rodando na porta ${config.port}`);
  console.log(`📡 Modo de Execução: ${config.nodeEnv}`);
  console.log(`🔗 API Evolution configurada: ${config.evolutionApiUrl}`);
  console.log('====================================================');

  // Inicializar o agendador de tarefas
  schedulerService.start();
});

// Encerramento Gracioso
async function gracefulShutdown(signal: string) {
  console.log(`[Sistema] Sinal de parada recebido (${signal}). Encerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[Sistema] Conexões fechadas com sucesso.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Sistema] Erro não tratado:', reason);
});

export default app;
