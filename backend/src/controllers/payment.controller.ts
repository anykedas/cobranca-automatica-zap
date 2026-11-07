import { Request, Response } from 'express';
import { z } from 'zod';
import { paymentService } from '../services/payment.service.js';

const markPaidSchema = z.object({
  amount: z.number().nullable().optional(),
  paidAt: z.string().or(z.date()).optional(),
  notes: z.string().nullable().optional()
});

export class PaymentController {
  async markAsPaid(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const body = markPaidSchema.parse(req.body);
    const result = await paymentService.markAsPaid(id, body as any);
    res.json({
      message: 'Pagamento confirmado e ciclo de cobrança avançado com sucesso.',
      ...result
    });
  }

  async getCustomerPayments(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const payments = await paymentService.getCustomerPayments(id);
    res.json({ payments });
  }

  async getRecentPayments(req: Request, res: Response): Promise<void> {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const payments = await paymentService.listRecentPayments(limit);
    res.json({ payments });
  }
}

export const paymentController = new PaymentController();
