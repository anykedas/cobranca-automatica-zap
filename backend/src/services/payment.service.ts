import { prisma } from '../config/index.js';
import { addMonths, addYears } from 'date-fns';
import { RecurrenceType } from '../types/index.js';

export class PaymentService {
  /**
   * Calcula a próxima data de vencimento com base no tipo de recorrência
   */
  calculateNextDueDate(currentDueDate: Date, recurrence: RecurrenceType): Date {
    const baseDate = new Date(currentDueDate);
    switch (recurrence) {
      case 'MENSAL':
        return addMonths(baseDate, 1);
      case 'TRIMESTRAL':
        return addMonths(baseDate, 3);
      case 'SEMESTRAL':
        return addMonths(baseDate, 6);
      case 'ANUAL':
        return addYears(baseDate, 1);
      default:
        return addMonths(baseDate, 1);
    }
  }

  /**
   * Confirma o pagamento do cliente, grava histórico e avança o vencimento para o próximo ciclo
   */
  async markAsPaid(customerId: string, data?: { amount?: number; paidAt?: Date | string; notes?: string }) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw new Error('Cliente não encontrado.');
    }

    const paidAt = data?.paidAt ? new Date(data.paidAt) : new Date();
    const paidAmount = data?.amount !== undefined && data?.amount !== null 
      ? Number(data.amount) 
      : (customer.amount ? Number(customer.amount) : 0);

    const currentDueDate = customer.dueDate;
    const nextDueDate = this.calculateNextDueDate(currentDueDate, customer.recurrence);

    // Transação: Cria pagamento, atualiza cliente e cancela mensagens pendentes
    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar registro de pagamento vinculado ao ciclo atual
      const payment = await tx.payment.create({
        data: {
          customerId: customer.id,
          amount: paidAmount,
          paidAt: paidAt,
          dueDateReference: currentDueDate,
          notes: data?.notes || `Pagamento registrado com sucesso. Próximo ciclo: ${nextDueDate.toLocaleDateString('pt-BR')}`
        }
      });

      // 2. Atualizar o cliente com a nova data de vencimento
      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          dueDate: nextDueDate
        },
        include: {
          whatsapp: true
        }
      });

      // 3. Cancelar quaisquer mensagens pendentes para este cliente
      await tx.messageHistory.updateMany({
        where: {
          customerId: customer.id,
          status: 'PENDING'
        },
        data: {
          status: 'CANCELLED',
          failureReason: 'Cancelado automaticamente: Fatura marcada como paga.'
        }
      });

      return { payment, updatedCustomer, nextDueDate };
    });

    return result;
  }

  /**
   * Obtém histórico de pagamentos de um cliente específico
   */
  async getCustomerPayments(customerId: string) {
    return await prisma.payment.findMany({
      where: { customerId },
      orderBy: { paidAt: 'desc' }
    });
  }

  /**
   * Lista os últimos pagamentos registrados no sistema
   */
  async listRecentPayments(limit = 10) {
    return await prisma.payment.findMany({
      take: limit,
      orderBy: { paidAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });
  }
}

export const paymentService = new PaymentService();
