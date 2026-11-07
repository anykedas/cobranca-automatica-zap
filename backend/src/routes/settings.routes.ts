import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res, next) => settingsController.getAll(req, res).catch(next));
router.put('/', (req, res, next) => settingsController.updateBulk(req, res).catch(next));

export default router;
