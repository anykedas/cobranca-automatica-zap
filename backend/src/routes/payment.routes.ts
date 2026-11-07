import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/customer/:id/pay', (req, res, next) => paymentController.markAsPaid(req, res).catch(next));
router.get('/customer/:id/history', (req, res, next) => paymentController.getCustomerPayments(req, res).catch(next));
router.get('/recent', (req, res, next) => paymentController.getRecentPayments(req, res).catch(next));

export default router;
