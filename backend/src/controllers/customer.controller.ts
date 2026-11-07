import { Request, Response } from 'express';
import { z } from 'zod';
import { customerService } from '../services/customer.service.js';

const customerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  dueDate: z.string().or(z.date()),
  recurrence: z.enum(['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']),
  amount: z.number().nullable().optional(),
  whatsappId: z.string().uuid('ID de WhatsApp inválido'),
  customMessage: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  notes: z.string().nullable().optional()
});

export class CustomerController {
  async list(req: Request, res: Response): Promise<void> {
    const { search, status, dueFilter, whatsappId, page, limit } = req.query;

    const result = await customerService.listCustomers({
      search: search as string,
      status: status as any,
      dueFilter: dueFilter as any,
      whatsappId: whatsappId as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20
    });

    res.json(result);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const customer = await customerService.getCustomerById(id);
    res.json({ customer });
  }

  async create(req: Request, res: Response): Promise<void> {
    const validatedData = customerSchema.parse(req.body);
    const customer = await customerService.createCustomer(validatedData as any);
    res.status(201).json({ customer });
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const validatedData = customerSchema.partial().parse(req.body);
    const customer = await customerService.updateCustomer(id, validatedData as any);
    res.json({ customer });
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    await customerService.deleteCustomer(id);
    res.json({ message: 'Cliente excluído com sucesso.' });
  }
}

export const customerController = new CustomerController();
