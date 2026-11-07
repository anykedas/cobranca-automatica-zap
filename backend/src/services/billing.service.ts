import { prisma } from '../config/index.js';
import { evolutionService } from './evolution.service.js';
import { BillingStage } from '../types/index.js';
import { format, startOfDay, addDays, subDays, differenceInCalendarDays } from 'date-fns';

export interface BillingConfigMap {
  DAYS_BEFORE_DUE: number;
  SEND_ON_DUE_DATE: boolean;
  DAYS_AFTER_DUE: number;
  SEND_START_HOUR: string;
  SEND_END_HOUR: string;
  MIN_DELAY_SECONDS: number;
  MAX_DELAY_SECONDS: number;
  DEFAULT_MESSAGE_BEFORE: string;
  DEFAULT_MESSAGE_DUE: string;
  DEFAULT_MESSAGE_AFTER: string;
  PIX_KEY: string;
  COMPANY_NAME: string;
  PAYMENT_LINK: string;
}

export class BillingService {
  /**
   * Utilitário para aguardar N milissegundos
   */
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gera um delay aleatório entre min e max segundos para proteção anti-bloqueio
   */
  private getRandomDelay(minSeconds: number, maxSeconds: number): number {
    const min = Math.max(1, minSeconds);
    const max = Math.max(min, maxSeconds);
    const delaySec = Math.floor(Math.random() * (max - min + 1)) + min;
    return delaySec * 1000;
  }

  /**
   * Carrega todas as configurações do banco de dados em um mapa tipado
   */
  async loadSettings(): Promise<BillingConfigMap> {
    const settings = await prisma.setting.findMany();
    const map = new Map<string, string>();
    settings.forEach((s) => map.set(s.key, s.value));

    return {
      DAYS_BEFORE_DUE: parseInt(map.get('DAYS_BEFORE_DUE') || '3', 10),
      SEND_ON_DUE_DATE: (map.get('SEND_ON_DUE_DATE') || 'true') === 'true',
      DAYS_AFTER_DUE: parseInt(map.get('DAYS_AFTER_DUE') || '2', 10),
      SEND_START_HOUR: map.get('SEND_START_HOUR') || '08:00',
      SEND_END_HOUR: map.get('SEND_END_HOUR') || '18:00',
      MIN_DELAY_SECONDS: parseInt(map.get('MIN_DELAY_SECONDS') || '15', 10),
      MAX_DELAY_SECONDS: parseInt(map.get('MAX_DELAY_SECONDS') || '35', 10),
      DEFAULT_MESSAGE_BEFORE: map.get('DEFAULT_MESSAGE_BEFORE') || 'Olá {nome}, sua fatura vence em {vencimento}.',
      DEFAULT_MESSAGE_DUE: map.get('DEFAULT_MESSAGE_DUE') || 'Olá {nome}, sua fatura vence hoje ({vencimento}).',
      DEFAULT_MESSAGE_AFTER: map.get('DEFAULT_MESSAGE_AFTER') || 'Olá {nome}, seu pagamento de {vencimento} consta pendente.',
      PIX_KEY: map.get('PIX_KEY') || '',
      COMPANY_NAME: map.get('COMPANY_NAME') || 'Cobrança Automática',
      PAYMENT_LINK: map.get('PAYMENT_LINK') || ''
    };
  }

  /**
   * Valida se a hora atual está dentro da janela permitida para disparos
   */
  isWithinSendingWindow(startHourStr: string, endHourStr: string): boolean {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startHourStr.split(':').map(Number);
    const [endH, endM] = endHourStr.split(':').map(Number);

    const startTotal = (startH || 8) * 60 + (startM || 0);
    const endTotal = (endH || 18) * 60 + (endM || 0);

    return currentMinutes >= startTotal && currentMinutes <= endTotal;
  }

  /**
   * Substitui as variáveis dinâmicas no modelo de mensagem
   */
  renderMessage(
    template: string,
    customer: { name: string; phone: string; dueDate: Date; amount?: any },
    config: BillingConfigMap
  ): string {
    const capitalize = (str: string) =>
      str.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());

    const cleanName = customer.name.trim();
    const formattedFullName = capitalize(cleanName);
    const rawFirstName = cleanName.split(' ')[0] || cleanName;
    const formattedFirstName = capitalize(rawFirstName);

    const formattedDate = format(new Date(customer.dueDate), 'dd/MM/yyyy');
    const formattedAmount = customer.amount
      ? Number(customer.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0,00';

    return template
      .replace(/{nome}/g, formattedFullName)
      .replace(/{primeiro_nome}/g, formattedFirstName)
      .replace(/{telefone}/g, customer.phone)
      .replace(/{vencimento}/g, formattedDate)
      .replace(/{valor}/g, formattedAmount)
      .replace(/{chave_pix}/g, config.PIX_KEY)
      .replace(/{empresa}/g, config.COMPANY_NAME)
      .replace(/{link_pagamento}/g, config.PAYMENT_LINK || '')
      .replace(/{link_cartao}/g, config.PAYMENT_LINK || '');
  }

  /**
   * Executa a rotina de verificação e envio automático de cobranças
   * Chamado pelo cron e pode ser acionado manualmente pelo administrador
   */
  async processBillingQueue(forceRun = false): Promise<{ processed: number; sent: number; failed: number; skipped: number; reason?: string }> {
    const settings = await this.loadSettings();

    // 1. Verificar janela de horário, a menos que seja forçado manualmente
    if (!forceRun && !this.isWithinSendingWindow(settings.SEND_START_HOUR, settings.SEND_END_HOUR)) {
      return {
        processed: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        reason: `Fora da janela de envio permitida (${settings.SEND_START_HOUR} às ${settings.SEND_END_HOUR})`
      };
    }

    const today = startOfDay(new Date());

    // 2. Buscar todos os clientes ativos com suas instâncias de WhatsApp
    const activeCustomers = await prisma.customer.findMany({
      where: { status: 'ACTIVE' },
      include: {
        whatsapp: true
      }
    });

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let processedCount = 0;

    for (const customer of activeCustomers) {
      const customerDueDate = startOfDay(new Date(customer.dueDate));
      const diffDays = differenceInCalendarDays(customerDueDate, today);

      let stage: BillingStage | null = null;
      let templateToUse: string = '';

      // Determinar se o cliente se enquadra em alguma etapa da régua
      if (diffDays === settings.DAYS_BEFORE_DUE) {
        stage = 'BEFORE_DUE';
        templateToUse = customer.customMessage || settings.DEFAULT_MESSAGE_BEFORE;
      } else if (diffDays === 0 && settings.SEND_ON_DUE_DATE) {
        stage = 'ON_DUE';
        templateToUse = customer.customMessage || settings.DEFAULT_MESSAGE_DUE;
      } else if (diffDays === -settings.DAYS_AFTER_DUE) {
        stage = 'AFTER_DUE';
        templateToUse = customer.customMessage || settings.DEFAULT_MESSAGE_AFTER;
      }

      if (!stage) {
        // Não está no dia de envio de nenhuma etapa configurada
        continue;
      }

      processedCount++;

      // 3. Controle Anti-Duplicação: Verifica se já foi enviado para este cliente, ciclo e etapa
      const alreadySent = await prisma.billingLog.findUnique({
        where: {
          customerId_dueDateReference_stage: {
            customerId: customer.id,
            dueDateReference: customer.dueDate,
            stage: stage
          }
        }
      });

      if (alreadySent) {
        skippedCount++;
        continue;
      }

      // 4. Renderizar a mensagem
      const messageContent = this.renderMessage(templateToUse, customer, settings);

      // 5. Verificar status da instância do WhatsApp
      const isConnected = customer.whatsapp && customer.whatsapp.status === 'CONNECTED';

      if (!isConnected) {
        const failureReason = `WhatsApp '${customer.whatsapp?.name || 'Não vinculado'}' não está conectado.`;
        await prisma.messageHistory.create({
          data: {
            customerId: customer.id,
            whatsappId: customer.whatsappId,
            phone: customer.phone,
            message: messageContent,
            stage: stage,
            status: 'FAILED',
            failureReason: failureReason
          }
        });
        failedCount++;
        continue;
      }

      // 6. Enviar a mensagem pela Evolution API
      try {
        await evolutionService.sendTextMessage(
          customer.whatsapp.instanceName,
          customer.phone,
          messageContent
        );

        // 7. Gravar Log de Cobrança e Histórico com Sucesso
        await prisma.$transaction([
          prisma.billingLog.create({
            data: {
              customerId: customer.id,
              dueDateReference: customer.dueDate,
              stage: stage
            }
          }),
          prisma.messageHistory.create({
            data: {
              customerId: customer.id,
              whatsappId: customer.whatsappId,
              phone: customer.phone,
              message: messageContent,
              stage: stage,
              status: 'SENT',
              sentAt: new Date()
            }
          })
        ]);

        sentCount++;

        // 8. Delay de proteção anti-bloqueio entre mensagens
        const delayMs = this.getRandomDelay(settings.MIN_DELAY_SECONDS, settings.MAX_DELAY_SECONDS);
        await this.sleep(delayMs);

      } catch (err: any) {
        console.error(`[Billing] Erro ao enviar para ${customer.name} (${customer.phone}):`, err.message);

        await prisma.messageHistory.create({
          data: {
            customerId: customer.id,
            whatsappId: customer.whatsappId,
            phone: customer.phone,
            message: messageContent,
            stage: stage,
            status: 'FAILED',
            failureReason: err.message
          }
        });

        failedCount++;
      }
    }

    return {
      processed: processedCount,
      sent: sentCount,
      failed: failedCount,
      skipped: skippedCount
    };
  }

  /**
   * Envia uma mensagem avulsa/manual para um cliente
   */
  async sendManualMessage(customerId: string, customText?: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { whatsapp: true }
    });

    if (!customer) {
      throw new Error('Cliente não encontrado.');
    }

    if (!customer.whatsapp) {
      throw new Error('Cliente não possui número de WhatsApp vinculado.');
    }

    const settings = await this.loadSettings();
    const textTemplate = customText || customer.customMessage || settings.DEFAULT_MESSAGE_DUE;
    const renderedText = this.renderMessage(textTemplate, customer, settings);

    if (customer.whatsapp.status !== 'CONNECTED') {
      throw new Error(`O número WhatsApp '${customer.whatsapp.name}' está desconectado.`);
    }

    try {
      await evolutionService.sendTextMessage(
        customer.whatsapp.instanceName,
        customer.phone,
        renderedText
      );

      const history = await prisma.messageHistory.create({
        data: {
          customerId: customer.id,
          whatsappId: customer.whatsappId,
          phone: customer.phone,
          message: renderedText,
          stage: 'MANUAL',
          status: 'SENT',
          sentAt: new Date()
        }
      });

      return history;
    } catch (error: any) {
      await prisma.messageHistory.create({
        data: {
          customerId: customer.id,
          whatsappId: customer.whatsappId,
          phone: customer.phone,
          message: renderedText,
          stage: 'MANUAL',
          status: 'FAILED',
          failureReason: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Reenvia manualmente uma mensagem que falhou
   */
  async retryMessage(historyId: string) {
    const historyItem = await prisma.messageHistory.findUnique({
      where: { id: historyId },
      include: {
        customer: true,
        whatsapp: true
      }
    });

    if (!historyItem) {
      throw new Error('Registro de histórico não encontrado.');
    }

    const instanceName = historyItem.whatsapp?.instanceName;
    if (!instanceName) {
      throw new Error('Instância de WhatsApp associada não foi localizada.');
    }

    try {
      await evolutionService.sendTextMessage(
        instanceName,
        historyItem.phone,
        historyItem.message
      );

      return await prisma.messageHistory.update({
        where: { id: historyId },
        data: {
          status: 'SENT',
          failureReason: null,
          sentAt: new Date()
        }
      });
    } catch (error: any) {
      return await prisma.messageHistory.update({
        where: { id: historyId },
        data: {
          status: 'FAILED',
          failureReason: `Tentativa de reenvio falhou: ${error.message}`
        }
      });
    }
  }
}

export const billingService = new BillingService();
