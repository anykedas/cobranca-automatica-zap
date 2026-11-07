import { Router } from 'express';
import { customerController } from '../controllers/customer.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res, next) => customerController.list(req, res).catch(next));
router.post('/', (req, res, next) => customerController.create(req, res).catch(next));
router.get('/:id', (req, res, next) => customerController.getById(req, res).catch(next));
router.put('/:id', (req, res, next) => customerController.update(req, res).catch(next));
router.delete('/:id', (req, res, next) => customerController.delete(req, res).catch(next));

export default router;
