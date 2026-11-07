import { Router } from 'express';
import authRoutes from './auth.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import customerRoutes from './customer.routes.js';
import billingRoutes from './billing.routes.js';
import paymentRoutes from './payment.routes.js';
import historyRoutes from './history.routes.js';
import statsRoutes from './stats.routes.js';
import settingsRoutes from './settings.routes.js';
import financeRoutes from './finance.routes.js';
import { whatsAppController } from '../controllers/whatsapp.controller.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/customers', customerRoutes);
router.use('/billing', billingRoutes);
router.use('/payments', paymentRoutes);
router.use('/history', historyRoutes);
router.use('/stats', statsRoutes);
router.use('/settings', settingsRoutes);
router.use('/finance', financeRoutes);

// Rota de conveniência direta POST /api/send-message
router.post('/send-message', (req, res, next) => whatsAppController.sendMessage(req, res).catch(next));

export default router;
