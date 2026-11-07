import { prisma } from '../config/index.js';
import { startOfDay, endOfDay, addDays, startOfMonth, endOfMonth } from 'date-fns';

export class StatsService {
  /**
   * Coleta todas as métricas para o Dashboard do Administrador
   */
  async getDashboardStats() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const upcomingLimit = endOfDay(addDays(now, 3));
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [
      totalCustomers,
      activeCustomers,
      overdueCustomers,
      upcomingCustomers,
      dueTodayCustomers,
      sentMessages,
      failedMessages,
      connectedWhatsAppCount,
      totalWhatsAppCount,
      paymentsThisMonth
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
      prisma.customer.count({
        where: {
          status: 'ACTIVE',
          dueDate: { lt: todayStart }
        }
      }),
      prisma.customer.count({
        where: {
          status: 'ACTIVE',
          dueDate: {
            gte: todayStart,
            lte: upcomingLimit
          }
        }
      }),
      prisma.customer.count({
        where: {
          status: 'ACTIVE',
          dueDate: {
            gte: todayStart,
            lte: todayEnd
          }
        }
      }),
      prisma.messageHistory.count({ where: { status: 'SENT' } }),
      prisma.messageHistory.count({ where: { status: 'FAILED' } }),
      prisma.whatsAppInstance.count({ where: { status: 'CONNECTED' } }),
      prisma.whatsAppInstance.count(),
      prisma.payment.aggregate({
        where: {
          paidAt: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        _sum: {
          amount: true
        },
        _count: true
      })
    ]);

    return {
      totalCustomers,
      activeCustomers,
      overdueCustomers,
      upcomingCustomers,
      dueTodayCustomers,
      sentMessages,
      failedMessages,
      connectedWhatsAppCount,
      totalWhatsAppCount,
      revenueThisMonth: paymentsThisMonth._sum.amount ? Number(paymentsThisMonth._sum.amount) : 0,
      paymentsCountThisMonth: paymentsThisMonth._count
    };
  }
}

export const statsService = new StatsService();
