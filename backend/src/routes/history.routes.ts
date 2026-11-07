import { Router } from 'express';
import { historyController } from '../controllers/history.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res, next) => historyController.list(req, res).catch(next));

export default router;
