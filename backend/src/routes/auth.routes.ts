import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', (req, res, next) => authController.login(req, res).catch(next));
router.get('/me', authMiddleware, (req, res, next) => authController.me(req, res).catch(next));
router.put('/profile', authMiddleware, (req, res, next) => authController.updateProfile(req, res).catch(next));
router.post('/change-password', authMiddleware, (req, res, next) => authController.changePassword(req, res).catch(next));

export default router;
