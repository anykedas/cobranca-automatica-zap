import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');

  // 1. Criar usuário administrador padrão se não existir
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@cobranca.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Seguro2026!';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        name: 'Administrador',
        email: adminEmail,
        password: passwordHash,
        role: 'ADMIN'
      }
    });
    console.log(`[Seed] Usuário administrador criado: ${adminEmail}`);
  } else {
    console.log(`[Seed] Usuário administrador já existe: ${adminEmail}`);
  }

  // 2. Configurações padrão do sistema
  const defaultSettings = [
    {
      key: 'DAYS_BEFORE_DUE',
      value: '3',
      description: 'Quantos dias antes do vencimento enviar lembrete'
    },
    {
      key: 'SEND_ON_DUE_DATE',
      value: 'true',
      description: 'Enviar cobrança no dia do vencimento (true/false)'
    },
    {
      key: 'DAYS_AFTER_DUE',
      value: '2',
      description: 'Quantos dias após o vencimento enviar aviso de pendência'
    },
    {
      key: 'SEND_START_HOUR',
      value: '08:00',
      description: 'Horário de início permitido para disparos'
    },
    {
      key: 'SEND_END_HOUR',
      value: '18:00',
      description: 'Horário limite permitido para disparos'
    },
    {
      key: 'MIN_DELAY_SECONDS',
      value: '15',
      description: 'Intervalo mínimo entre envios (segundos) para proteção anti-bloqueio'
    },
    {
      key: 'MAX_DELAY_SECONDS',
      value: '35',
      description: 'Intervalo máximo entre envios (segundos)'
    },
    {
      key: 'DEFAULT_MESSAGE_BEFORE',
      value: `*LEMBRETE DE FATURA* 🔔\n━━━━━━━━━━━━━━━━━━━━\nOlá, *{nome}*!\n\nLembramos que sua fatura no valor de *R$ {valor}* vence em *{vencimento}*.\n\n📋 *FORMAS DE PAGAMENTO:*\n\n💠 *PIX (Toque na chave abaixo para copiar):*\n{chave_pix}\n\n💳 *Cartão de Crédito:*\n{link_pagamento}\n\n━━━━━━━━━━━━━━━━━━━━\nApós efetuar o pagamento, por gentileza envie o comprovante por aqui.\n\nAgradecemos a parceria!\n_{empresa}_`,
      description: 'Mensagem padrão enviada antes do vencimento'
    },
    {
      key: 'DEFAULT_MESSAGE_DUE',
      value: `*AVISO DE VENCIMENTO* 📄\n━━━━━━━━━━━━━━━━━━━━\nOlá, *{nome}*!\n\nInformamos que sua fatura vence *hoje, {vencimento}*.\n\n📋 *DETALHES DO PAGAMENTO:*\n▫ *Valor:* R$ {valor}\n▫ *Vencimento:* {vencimento}\n\n💠 *PAGAR VIA PIX (Chave Copia e Cola):*\n{chave_pix}\n\n💳 *PAGAR COM CARTÃO:*\n{link_pagamento}\n\n━━━━━━━━━━━━━━━━━━━━\nApós realizar o pagamento, por favor nos envie o comprovante.\n\nQualquer dúvida, estamos à disposição!\n_{empresa}_`,
      description: 'Mensagem padrão enviada no dia do vencimento'
    },
    {
      key: 'DEFAULT_MESSAGE_AFTER',
      value: `*AVISO DE FATURA PENDENTE* ⚠️\n━━━━━━━━━━━━━━━━━━━━\nOlá, *{nome}*!\n\nConstatamos que sua fatura de *R$ {valor}* com vencimento em *{vencimento}* ainda não foi identificada em nosso sistema.\n\n📋 *REGULARIZE FACILMENTE:*\n\n💠 *Chave PIX (Toque para copiar):*\n{chave_pix}\n\n💳 *Link para Cartão:*\n{link_pagamento}\n\n━━━━━━━━━━━━━━━━━━━━\nCaso já tenha efetuado o pagamento, por favor nos envie o comprovante para darmos baixa imediata.\n\n_{empresa}_`,
      description: 'Mensagem padrão enviada após o vencimento'
    },
    {
      key: 'PIX_KEY',
      value: '32115549805',
      description: 'Chave PIX padrão para inclusão automática nas mensagens'
    },
    {
      key: 'PAYMENT_LINK',
      value: 'https://mpago.la/1V5t7hU',
      description: 'Link de pagamento / cartão padrão (ex: Mercado Pago, Stripe)'
    },
    {
      key: 'COMPANY_NAME',
      value: 'CobraZap Financeiro',
      description: 'Nome da empresa para inclusão nas mensagens'
    }
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s
    });
  }

  console.log('[Seed] Configurações padrão verificadas/inseridas com sucesso.');
}

main()
  .catch((e) => {
    console.error('[Seed] Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
