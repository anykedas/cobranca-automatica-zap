import cron from 'node-cron';
import { billingService } from './billing.service.js';

class SchedulerService {
  private isRunning = false;

  /**
   * Inicializa o agendador de tarefas periódicas
   */
  start() {
    console.log('[Scheduler] Inicializando agendador de cobranças automáticas...');

    // Executa a cada 10 minutos para verificar clientes e disparar mensagens dentro da janela
    cron.schedule('*/10 * * * *', async () => {
      if (this.isRunning) {
        console.log('[Scheduler] Execução anterior ainda em andamento. Aguardando...');
        return;
      }

      try {
        this.isRunning = true;
        console.log('[Scheduler] Iniciando verificação de cobranças programadas...');
        const result = await billingService.processBillingQueue();
        if (result.processed > 0) {
          console.log(`[Scheduler] Fila processada: ${result.sent} enviadas, ${result.failed} falhas, ${result.skipped} já enviadas.`);
        } else if (result.reason) {
          console.log(`[Scheduler] Execução ignorada: ${result.reason}`);
        }
      } catch (error) {
        console.error('[Scheduler] Erro ao executar fila de cobrança:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('[Scheduler] Agendador ativo e programado para rodar a cada 10 minutos.');
  }
}

export const schedulerService = new SchedulerService();
