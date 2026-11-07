import { Request, Response } from 'express';
import { z } from 'zod';
import { billingService } from '../services/billing.service.js';
import { prisma } from '../config/index.js';

const manualSendSchema = z.object({
  message: z.string().optional()
});

export class BillingController {
  async getSettings(_req: Request, res: Response): Promise<void> {
    const settings = await billingService.loadSettings();
    res.json({ settings });
  }

  async runBillingQueueNow(_req: Request, res: Response): Promise<void> {
    const result = await billingService.processBillingQueue(true);
    res.json({
      message: 'Processamento de cobrança disparado manualmente com sucesso.',
      result
    });
  }

  async sendManualMessage(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { message } = manualSendSchema.parse(req.body);
    const history = await billingService.sendManualMessage(id, message);
    res.json({
      message: 'Mensagem enviada com sucesso.',
      history
    });
  }

  async retryMessage(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const history = await billingService.retryMessage(id);
    res.json({
      message: history.status === 'SENT' ? 'Mensagem reenviada com sucesso!' : 'Tentativa falhou. Verifique o log.',
      history
    });
  }
}

export const billingController = new BillingController();
