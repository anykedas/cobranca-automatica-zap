import { Request, Response } from 'express';
import { z } from 'zod';
import { financeService } from '../services/finance.service.js';

const expenseCreateSchema = z.object({
  name: z.string().min(1, 'Nome do fornecedor ou serviço é obrigatório'),
  category: z.string().optional(),
  description: z.string().nullable().optional(),
  amount: z.number().positive('O valor deve ser maior que zero'),
  dueDate: z.string().or(z.date()),
  paidAt: z.string().or(z.date()).nullable().optional(),
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']).optional(),
  notes: z.string().nullable().optional(),
  whatsappId: z.string().nullable().optional(),
  recurrence: z.enum(['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']).nullable().optional()
});

const expenseUpdateSchema = expenseCreateSchema.partial();

const markPaidSchema = z.object({
  paidAt: z.string().or(z.date()).optional(),
  notes: z.string().nullable().optional()
});

export class FinanceController {
  /**
   * Resumo de estatísticas financeiras (receitas, fornecedores, lucro e inadimplência)
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const whatsappId = req.query.whatsappId as string | undefined;
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

      const stats = await financeService.getStats({ whatsappId, month, year });
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao obter estatísticas financeiras.' });
    }
  }

  /**
   * Relatório mensal consolidado (12 meses do ano)
   */
  async getMonthlyReport(req: Request, res: Response): Promise<void> {
    try {
      const whatsappId = req.query.whatsappId as string | undefined;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

      const report = await financeService.getMonthlyReport({ whatsappId, year });
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao obter relatório mensal.' });
    }
  }

  /**
   * Clientes inadimplentes detalhados
   */
  async getOverdueCustomers(req: Request, res: Response): Promise<void> {
    try {
      const whatsappId = req.query.whatsappId as string | undefined;
      const customers = await financeService.getOverdueCustomers(whatsappId);
      res.json({ customers });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao listar clientes inadimplentes.' });
    }
  }

  /**
   * Listar despesas com fornecedores
   */
  async listExpenses(req: Request, res: Response): Promise<void> {
    try {
      const whatsappId = req.query.whatsappId as string | undefined;
      const status = req.query.status as string | undefined;
      const category = req.query.category as string | undefined;
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

      const expenses = await financeService.listExpenses({
        whatsappId,
        status,
        category,
        month,
        year
      });
      res.json({ expenses });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao listar despesas.' });
    }
  }

  /**
   * Criar nova despesa
   */
  async createExpense(req: Request, res: Response): Promise<void> {
    try {
      const parsed = expenseCreateSchema.parse(req.body);
      const expense = await financeService.createExpense(parsed as any);
      res.status(201).json({
        message: 'Despesa registrada com sucesso.',
        expense
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0]?.message || 'Dados inválidos' });
        return;
      }
      res.status(500).json({ error: error.message || 'Erro ao cadastrar despesa.' });
    }
  }

  /**
   * Atualizar despesa
   */
  async updateExpense(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = expenseUpdateSchema.parse(req.body);
      const expense = await financeService.updateExpense(id, parsed as any);
      res.json({
        message: 'Despesa atualizada com sucesso.',
        expense
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0]?.message || 'Dados inválidos' });
        return;
      }
      res.status(500).json({ error: error.message || 'Erro ao atualizar despesa.' });
    }
  }

  /**
   * Marcar despesa como paga
   */
  async markExpenseAsPaid(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = markPaidSchema.parse(req.body);
      const expense = await financeService.markExpenseAsPaid(id, parsed as any);
      res.json({
        message: 'Pagamento ao fornecedor registrado com sucesso.',
        expense
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao registrar pagamento do fornecedor.' });
    }
  }

  /**
   * Excluir despesa
   */
  async deleteExpense(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await financeService.deleteExpense(id);
      res.json({ message: 'Despesa excluída com sucesso.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao excluir despesa.' });
    }
  }
}

export const financeController = new FinanceController();
