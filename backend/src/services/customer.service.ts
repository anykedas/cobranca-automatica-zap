import { prisma } from '../config/index.js';
import { CustomerStatus, RecurrenceType } from '../types/index.js';
import { startOfDay, endOfDay, addDays, isBefore } from 'date-fns';

export interface CustomerFilterParams {
  search?: string;
  status?: CustomerStatus;
  dueFilter?: 'OVERDUE' | 'TODAY' | 'UPCOMING_3' | 'UPCOMING_7' | 'ALL';
  whatsappId?: string;
  page?: number;
  limit?: number;
}

export interface CreateCustomerDTO {
  name: string;
  phone: string;
  dueDate: string | Date;
  recurrence: RecurrenceType;
  amount?: number | null;
  whatsappId: string;
  customMessage?: string | null;
  status?: CustomerStatus;
  notes?: string | null;
}

export class CustomerService {
  /**
   * Lista clientes com filtros avançados, busca e paginação
   */
  async listCustomers(params: CustomerFilterParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filtro de busca textual por nome ou telefone
    if (params.search && params.search.trim() !== '') {
      const searchClean = params.search.trim();
      const phoneDigits = searchClean.replace(/\D/g, '');
      where.OR = [
        { name: { contains: searchClean, mode: 'insensitive' } },
        ...(phoneDigits ? [{ phone: { contains: phoneDigits } }] : [])
      ];
    }

    // Filtro de status
    if (params.status) {
      where.status = params.status;
    }

    // Filtro de WhatsApp responsável
    if (params.whatsappId) {
      where.whatsappId = params.whatsappId;
    }

    // Filtro de vencimento
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    if (params.dueFilter === 'OVERDUE') {
      where.dueDate = { lt: todayStart };
      where.status = 'ACTIVE';
    } else if (params.dueFilter === 'TODAY') {
      where.dueDate = {
        gte: todayStart,
        lte: todayEnd
      };
    } else if (params.dueFilter === 'UPCOMING_3') {
      where.dueDate = {
        gte: todayStart,
        lte: endOfDay(addDays(now, 3))
      };
    } else if (params.dueFilter === 'UPCOMING_7') {
      where.dueDate = {
        gte: todayStart,
        lte: endOfDay(addDays(now, 7))
      };
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          whatsapp: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          payments: {
            take: 1,
            orderBy: { paidAt: 'desc' }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              status: true,
              createdAt: true,
              stage: true
            }
          }
        }
      })
    ]);

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtém detalhes completos do cliente (histórico de pagamentos e mensagens)
   */
  async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        whatsapp: true,
        payments: {
          orderBy: { paidAt: 'desc' }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        billingLogs: {
          orderBy: { sentAt: 'desc' }
        }
      }
    });

    if (!customer) {
      throw new Error('Cliente não encontrado.');
    }

    return customer;
  }

  /**
   * Cadastra novo cliente
   */
  async createCustomer(data: CreateCustomerDTO) {
    // Validar WhatsApp selecionado
    const whatsapp = await prisma.whatsAppInstance.findUnique({
      where: { id: data.whatsappId }
    });

    if (!whatsapp) {
      throw new Error('Número de WhatsApp selecionado não existe.');
    }

    // Normalizar telefone (apenas números, adicionando 55 se omitido e tiver 10 ou 11 dígitos)
    let cleanPhone = data.phone.replace(/\D/g, '');
    if ((cleanPhone.length === 10 || cleanPhone.length === 11) && !cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }

    if (cleanPhone.length < 10) {
      throw new Error('Número de telefone inválido. Informe DDD e número com DDI.');
    }

    const dueDate = new Date(data.dueDate);

    return await prisma.customer.create({
      data: {
        name: data.name.trim(),
        phone: cleanPhone,
        dueDate,
        recurrence: data.recurrence || 'MENSAL',
        amount: data.amount ? Number(data.amount) : null,
        whatsappId: data.whatsappId,
        customMessage: data.customMessage?.trim() || null,
        status: data.status || 'ACTIVE',
        notes: data.notes?.trim() || null
      },
      include: {
        whatsapp: {
          select: { id: true, name: true, status: true }
        }
      }
    });
  }

  /**
   * Atualiza dados do cliente
   */
  async updateCustomer(id: string, data: Partial<CreateCustomerDTO>) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Cliente não encontrado para atualização.');
    }

    let cleanPhone = existing.phone;
    if (data.phone) {
      cleanPhone = data.phone.replace(/\D/g, '');
      if ((cleanPhone.length === 10 || cleanPhone.length === 11) && !cleanPhone.startsWith('55')) {
        cleanPhone = `55${cleanPhone}`;
      }
    }

    return await prisma.customer.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.phone ? { phone: cleanPhone } : {}),
        ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
        ...(data.recurrence ? { recurrence: data.recurrence } : {}),
        ...(data.amount !== undefined ? { amount: data.amount ? Number(data.amount) : null } : {}),
        ...(data.whatsappId ? { whatsappId: data.whatsappId } : {}),
        ...(data.customMessage !== undefined ? { customMessage: data.customMessage?.trim() || null } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {})
      },
      include: {
        whatsapp: {
          select: { id: true, name: true, status: true }
        }
      }
    });
  }

  /**
   * Exclui cliente
   */
  async deleteCustomer(id: string) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Cliente não encontrado.');
    }

    return await prisma.customer.delete({
      where: { id }
    });
  }
}

export const customerService = new CustomerService();
