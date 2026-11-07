import { Router } from 'express';
import { statsController } from '../controllers/stats.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/dashboard', (req, res, next) => statsController.getDashboardStats(req, res).catch(next));

export default router;
