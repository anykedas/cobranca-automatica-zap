import { Request, Response } from 'express';
import { prisma } from '../config/index.js';
import { z } from 'zod';

const updateSettingsSchema = z.record(z.string(), z.string());

export class SettingsController {
  async getAll(_req: Request, res: Response): Promise<void> {
    const settings = await prisma.setting.findMany({
      orderBy: { key: 'asc' }
    });
    res.json({ settings });
  }

  async updateBulk(req: Request, res: Response): Promise<void> {
    const updates = updateSettingsSchema.parse(req.body);

    const promises = Object.entries(updates).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    );

    await Promise.all(promises);

    const updatedSettings = await prisma.setting.findMany({
      orderBy: { key: 'asc' }
    });

    res.json({
      message: 'Configurações atualizadas com sucesso.',
      settings: updatedSettings
    });
  }
}

export const settingsController = new SettingsController();
