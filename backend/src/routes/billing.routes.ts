import { Router } from 'express';
import { billingController } from '../controllers/billing.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/settings', (req, res, next) => billingController.getSettings(req, res).catch(next));
router.post('/run-now', (req, res, next) => billingController.runBillingQueueNow(req, res).catch(next));
router.post('/customer/:id/send-manual', (req, res, next) => billingController.sendManualMessage(req, res).catch(next));
router.post('/retry/:id', (req, res, next) => billingController.retryMessage(req, res).catch(next));

export default router;
