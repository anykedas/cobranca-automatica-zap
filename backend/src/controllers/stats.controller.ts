import { Request, Response } from 'express';
import { statsService } from '../services/stats.service.js';

export class StatsController {
  async getDashboardStats(_req: Request, res: Response): Promise<void> {
    const stats = await statsService.getDashboardStats();
    res.json(stats);
  }
}

export const statsController = new StatsController();
