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

const importCustomersSchema = z.object({
  rawContent: z.string().optional(),
  format: z.enum(['json', 'csv']).optional(),
  contacts: z.array(z.any()).optional(),
  defaultWhatsappId: z.string().uuid().optional().or(z.literal('')),
  assignMode: z.enum(['preserve', 'override']).optional(),
  duplicateMode: z.enum(['skip', 'update']).optional()
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

  async exportBackup(req: Request, res: Response): Promise<void> {
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const whatsappId = req.query.whatsappId as string | undefined;
    const status = req.query.status as string | undefined;

    const result = await customerService.exportCustomers({ format, whatsappId, status });
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  }

  async importBackup(req: Request, res: Response): Promise<void> {
    const data = importCustomersSchema.parse(req.body);
    const result = await customerService.importCustomers({
      rawContent: data.rawContent,
      format: data.format,
      contacts: data.contacts,
      defaultWhatsappId: data.defaultWhatsappId || undefined,
      assignMode: data.assignMode,
      duplicateMode: data.duplicateMode
    });

    res.json({
      message: 'Processamento de importação concluído.',
      result
    });
  }
}

export const customerController = new CustomerController();
