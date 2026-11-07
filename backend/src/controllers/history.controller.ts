import { Request, Response } from 'express';
import { prisma } from '../config/index.js';
import { MessageStatus, BillingStage } from '../types/index.js';

export class HistoryController {
  async list(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 20);
    const skip = (page - 1) * limit;

    const { status, stage, customerId, search } = req.query;

    const where: any = {};

    if (status) {
      where.status = status as MessageStatus;
    }

    if (stage) {
      where.stage = stage as BillingStage;
    }

    if (customerId) {
      where.customerId = customerId as string;
    }

    if (search && (search as string).trim() !== '') {
      const searchClean = (search as string).trim();
      where.OR = [
        { phone: { contains: searchClean.replace(/\D/g, '') } },
        { message: { contains: searchClean, mode: 'insensitive' } },
        { customer: { name: { contains: searchClean, mode: 'insensitive' } } }
      ];
    }

    const [total, items] = await Promise.all([
      prisma.messageHistory.count({ where }),
      prisma.messageHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, phone: true }
          },
          whatsapp: {
            select: { id: true, name: true }
          }
        }
      })
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  }
}

export const historyController = new HistoryController();
