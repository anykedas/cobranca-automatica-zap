import { prisma } from '../config/index.js';
import { 
  startOfDay, 
  endOfDay, 
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  addYears,
  differenceInDays 
} from 'date-fns';

export interface FinanceStatsFilter {
  whatsappId?: string;
  month?: number; // 1 to 12
  year?: number;
}

export class FinanceService {
  /**
   * Resumo consolidado de KPIs financeiros:
   * - Receitas Aprovadas (Caixa Real)
   * - Custos de Fornecedores (Pagos e Pendentes)
   * - Lucro Líquido Real
   * - Volume da Carteira Ativa (Receita Projetada)
   * - Inadimplência (Valor e Quantidade de Devedores)
   */
  async getStats(filters: FinanceStatsFilter = {}) {
    const now = new Date();
    const year = filters.year || now.getFullYear();
    const month = filters.month || (now.getMonth() + 1);

    const monthDate = new Date(year, month - 1, 1);
    const mStart = startOfMonth(monthDate);
    const mEnd = endOfMonth(monthDate);
    const todayStart = startOfDay(now);

    const whatsappFilter = filters.whatsappId && filters.whatsappId !== 'all' 
      ? filters.whatsappId 
      : undefined;

    // 1. Receitas Aprovadas no Período (Pagamentos de Clientes)
    const paymentWhere: any = {
      paidAt: {
        gte: mStart,
        lte: mEnd
      }
    };
    if (whatsappFilter) {
      paymentWhere.customer = {
        whatsappId: whatsappFilter
      };
    }

    const paymentsAgg = await prisma.payment.aggregate({
      where: paymentWhere,
      _sum: { amount: true },
      _count: true
    });
    const totalApprovedRevenue = paymentsAgg._sum.amount ? Number(paymentsAgg._sum.amount) : 0;
    const paymentsCount = paymentsAgg._count;

    // 2. Despesas com Fornecedores Pagas no Período
    const expensePaidWhere: any = {
      status: 'PAID',
      paidAt: {
        gte: mStart,
        lte: mEnd
      }
    };
    if (whatsappFilter) {
      expensePaidWhere.whatsappId = whatsappFilter;
    }

    const expensesPaidAgg = await prisma.supplierExpense.aggregate({
      where: expensePaidWhere,
      _sum: { amount: true },
      _count: true
    });
    const totalSupplierExpensesPaid = expensesPaidAgg._sum.amount ? Number(expensesPaidAgg._sum.amount) : 0;
    const paidExpensesCount = expensesPaidAgg._count;

    // 3. Despesas com Fornecedores Pendentes (no mês)
    const expensePendingWhere: any = {
      status: 'PENDING',
      dueDate: {
        gte: mStart,
        lte: mEnd
      }
    };
    if (whatsappFilter) {
      expensePendingWhere.whatsappId = whatsappFilter;
    }

    const expensesPendingAgg = await prisma.supplierExpense.aggregate({
      where: expensePendingWhere,
      _sum: { amount: true },
      _count: true
    });
    const totalSupplierExpensesPending = expensesPendingAgg._sum.amount ? Number(expensesPendingAgg._sum.amount) : 0;
    const pendingExpensesCount = expensesPendingAgg._count;

    // 4. Carteira Ativa de Clientes (Receita Potencial / Contratos Ativos)
    const customerWhere: any = {
      status: 'ACTIVE'
    };
    if (whatsappFilter) {
      customerWhere.whatsappId = whatsappFilter;
    }

    const activeCustomersAgg = await prisma.customer.aggregate({
      where: customerWhere,
      _sum: { amount: true },
      _count: true
    });
    const totalContractValue = activeCustomersAgg._sum.amount ? Number(activeCustomersAgg._sum.amount) : 0;
    const activeCustomersCount = activeCustomersAgg._count;

    // 5. Inadimplência (Clientes Ativos com Vencimento < Hoje)
    const overdueCustomerWhere: any = {
      status: 'ACTIVE',
      dueDate: {
        lt: todayStart
      }
    };
    if (whatsappFilter) {
      overdueCustomerWhere.whatsappId = whatsappFilter;
    }

    const overdueAgg = await prisma.customer.aggregate({
      where: overdueCustomerWhere,
      _sum: { amount: true },
      _count: true
    });
    const overdueAmount = overdueAgg._sum.amount ? Number(overdueAgg._sum.amount) : 0;
    const overdueCount = overdueAgg._count;

    // 6. Cálculos de Resultados (DRE)
    const netProfit = totalApprovedRevenue - totalSupplierExpensesPaid;
    const projectedExpenses = totalSupplierExpensesPaid + totalSupplierExpensesPending;
    const projectedProfit = totalContractValue - projectedExpenses;
    const profitMargin = totalApprovedRevenue > 0 
      ? Number(((netProfit / totalApprovedRevenue) * 100).toFixed(1)) 
      : 0;

    return {
      period: {
        month,
        year,
        monthName: monthDate.toLocaleDateString('pt-BR', { month: 'long' })
      },
      whatsappId: whatsappFilter || 'all',
      // Realizado
      totalApprovedRevenue,
      paymentsCount,
      totalSupplierExpensesPaid,
      paidExpensesCount,
      netProfit,
      profitMargin,
      // Pendente / Projeção
      totalSupplierExpensesPending,
      pendingExpensesCount,
      projectedExpenses,
      projectedProfit,
      // Carteira Geral
      totalContractValue,
      activeCustomersCount,
      // Inadimplência
      overdueAmount,
      overdueCount
    };
  }

  /**
   * Demonstrativo Financeiro Mensal (12 meses do ano)
   */
  async getMonthlyReport(filters: { whatsappId?: string; year?: number } = {}) {
    const year = filters.year || new Date().getFullYear();
    const whatsappFilter = filters.whatsappId && filters.whatsappId !== 'all' 
      ? filters.whatsappId 
      : undefined;

    const monthlyData = [];

    for (let m = 0; m < 12; m++) {
      const monthDate = new Date(year, m, 1);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);

      // Receita do mês
      const payWhere: any = {
        paidAt: { gte: mStart, lte: mEnd }
      };
      if (whatsappFilter) {
        payWhere.customer = { whatsappId: whatsappFilter };
      }

      // Despesa paga do mês
      const expWhere: any = {
        status: 'PAID',
        paidAt: { gte: mStart, lte: mEnd }
      };
      if (whatsappFilter) {
        expWhere.whatsappId = whatsappFilter;
      }

      const [payAgg, expAgg] = await Promise.all([
        prisma.payment.aggregate({
          where: payWhere,
          _sum: { amount: true },
          _count: true
        }),
        prisma.supplierExpense.aggregate({
          where: expWhere,
          _sum: { amount: true },
          _count: true
        })
      ]);

      const revenue = payAgg._sum.amount ? Number(payAgg._sum.amount) : 0;
      const expenses = expAgg._sum.amount ? Number(expAgg._sum.amount) : 0;
      const profit = revenue - expenses;
      const margin = revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0;

      monthlyData.push({
        month: m + 1,
        monthName: monthDate.toLocaleDateString('pt-BR', { month: 'short' }),
        fullMonthName: monthDate.toLocaleDateString('pt-BR', { month: 'long' }),
        revenue,
        expenses,
        profit,
        margin,
        paymentsCount: payAgg._count,
        expensesCount: expAgg._count
      });
    }

    // Totais anuais
    const totalYearRevenue = monthlyData.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalYearExpenses = monthlyData.reduce((acc, curr) => acc + curr.expenses, 0);
    const totalYearProfit = totalYearRevenue - totalYearExpenses;
    const yearMargin = totalYearRevenue > 0 ? Number(((totalYearProfit / totalYearRevenue) * 100).toFixed(1)) : 0;

    return {
      year,
      whatsappId: whatsappFilter || 'all',
      summary: {
        totalYearRevenue,
        totalYearExpenses,
        totalYearProfit,
        yearMargin
      },
      months: monthlyData
    };
  }

  /**
   * Raio-X Detalhado de Clientes Inadimplentes (vencimento < hoje)
   */
  async getOverdueCustomers(whatsappId?: string) {
    const todayStart = startOfDay(new Date());
    const where: any = {
      status: 'ACTIVE',
      dueDate: { lt: todayStart }
    };

    if (whatsappId && whatsappId !== 'all') {
      where.whatsappId = whatsappId;
    }

    const overdueList = await prisma.customer.findMany({
      where,
      include: {
        whatsapp: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    return overdueList.map(c => {
      const daysOverdue = differenceInDays(todayStart, new Date(c.dueDate));
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        amount: c.amount ? Number(c.amount) : 0,
        dueDate: c.dueDate,
        recurrence: c.recurrence,
        daysOverdue,
        whatsappId: c.whatsappId,
        whatsappName: c.whatsapp?.name || 'Desconhecido',
        whatsappStatus: c.whatsapp?.status
      };
    });
  }

  /**
   * Listagem de despesas/fornecedores com filtros
   */
  async listExpenses(filters: { 
    whatsappId?: string; 
    status?: string; 
    month?: number; 
    year?: number; 
    category?: string;
  } = {}) {
    const where: any = {};

    if (filters.whatsappId && filters.whatsappId !== 'all') {
      where.whatsappId = filters.whatsappId;
    }

    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters.category && filters.category !== 'all') {
      where.category = filters.category;
    }

    if (filters.month && filters.year) {
      const mDate = new Date(filters.year, filters.month - 1, 1);
      where.dueDate = {
        gte: startOfMonth(mDate),
        lte: endOfMonth(mDate)
      };
    } else if (filters.year) {
      const yStart = new Date(filters.year, 0, 1);
      const yEnd = new Date(filters.year, 11, 31, 23, 59, 59);
      where.dueDate = {
        gte: yStart,
        lte: yEnd
      };
    }

    const expenses = await prisma.supplierExpense.findMany({
      where,
      include: {
        whatsapp: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { dueDate: 'asc' }
      ]
    });

    return expenses.map(e => ({
      ...e,
      amount: Number(e.amount)
    }));
  }

  /**
   * Cadastrar nova despesa / fornecedor
   */
  async createExpense(data: {
    name: string;
    category?: string;
    description?: string;
    amount: number;
    dueDate: string | Date;
    paidAt?: string | Date | null;
    status?: 'PENDING' | 'PAID' | 'CANCELLED';
    notes?: string;
    whatsappId?: string | null;
    recurrence?: any;
  }) {
    const dueDate = new Date(data.dueDate);
    const isPaid = data.status === 'PAID';
    const paidAt = isPaid ? (data.paidAt ? new Date(data.paidAt) : new Date()) : null;

    const expense = await prisma.supplierExpense.create({
      data: {
        name: data.name,
        category: data.category || 'Fornecedores',
        description: data.description || null,
        amount: data.amount,
        dueDate: dueDate,
        paidAt: paidAt,
        status: data.status || 'PENDING',
        notes: data.notes || null,
        whatsappId: data.whatsappId && data.whatsappId !== 'all' ? data.whatsappId : null,
        recurrence: data.recurrence || null
      },
      include: {
        whatsapp: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });

    return {
      ...expense,
      amount: Number(expense.amount)
    };
  }

  /**
   * Atualizar despesa
   */
  async updateExpense(id: string, data: any) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = Number(data.amount);
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.paidAt !== undefined) updateData.paidAt = data.paidAt ? new Date(data.paidAt) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.whatsappId !== undefined) {
      updateData.whatsappId = data.whatsappId && data.whatsappId !== 'all' ? data.whatsappId : null;
    }
    if (data.recurrence !== undefined) updateData.recurrence = data.recurrence;

    const updated = await prisma.supplierExpense.update({
      where: { id },
      data: updateData,
      include: {
        whatsapp: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });

    return {
      ...updated,
      amount: Number(updated.amount)
    };
  }

  /**
   * Dar baixa no pagamento de um fornecedor
   */
  async markExpenseAsPaid(id: string, data?: { paidAt?: string | Date; notes?: string }) {
    const expense = await prisma.supplierExpense.findUnique({
      where: { id }
    });

    if (!expense) {
      throw new Error('Despesa não encontrada.');
    }

    const paidAt = data?.paidAt ? new Date(data.paidAt) : new Date();

    const updated = await prisma.supplierExpense.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: paidAt,
        notes: data?.notes ? `${expense.notes ? expense.notes + ' | ' : ''}${data.notes}` : expense.notes
      },
      include: {
        whatsapp: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });

    // Se a despesa for recorrente (ex: mensal), gera automaticamente a próxima para o ciclo seguinte
    if (expense.recurrence) {
      let nextDueDate = new Date(expense.dueDate);
      switch (expense.recurrence) {
        case 'TRIMESTRAL': nextDueDate = addMonths(nextDueDate, 3); break;
        case 'SEMESTRAL': nextDueDate = addMonths(nextDueDate, 6); break;
        case 'ANUAL': nextDueDate = addYears(nextDueDate, 1); break;
        default: nextDueDate = addMonths(nextDueDate, 1); break;
      }

      await prisma.supplierExpense.create({
        data: {
          name: expense.name,
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          dueDate: nextDueDate,
          status: 'PENDING',
          whatsappId: expense.whatsappId,
          recurrence: expense.recurrence,
          notes: `Gerado automaticamente via recorrência ${expense.recurrence} após quitação em ${paidAt.toLocaleDateString('pt-BR')}`
        }
      });
    }

    return {
      ...updated,
      amount: Number(updated.amount)
    };
  }

  /**
   * Excluir despesa
   */
  async deleteExpense(id: string) {
    return prisma.supplierExpense.delete({
      where: { id }
    });
  }
}

export const financeService = new FinanceService();
