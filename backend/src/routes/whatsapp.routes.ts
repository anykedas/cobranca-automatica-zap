import { Router } from 'express';
import { whatsAppController } from '../controllers/whatsapp.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Webhook da Evolution API (público / protegido por IP ou token se configurado na Evolution)
router.post('/webhook', (req, res, next) => whatsAppController.webhook(req, res).catch(next));

// Rotas protegidas por autenticação administrativa
router.get('/', authMiddleware, (req, res, next) => whatsAppController.list(req, res).catch(next));
router.post('/', authMiddleware, (req, res, next) => whatsAppController.create(req, res).catch(next));
router.get('/:id', authMiddleware, (req, res, next) => whatsAppController.getById(req, res).catch(next));
router.get('/:id/qrcode', authMiddleware, (req, res, next) => whatsAppController.getQRCode(req, res).catch(next));
router.post('/:id/reconnect', authMiddleware, (req, res, next) => whatsAppController.reconnect(req, res).catch(next));
router.post('/:id/disconnect', authMiddleware, (req, res, next) => whatsAppController.disconnect(req, res).catch(next));
router.delete('/:id', authMiddleware, (req, res, next) => whatsAppController.delete(req, res).catch(next));

export default router;
