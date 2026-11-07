import { Router } from 'express';
import { financeController } from '../controllers/finance.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/stats', (req, res, next) => financeController.getStats(req, res).catch(next));
router.get('/monthly-report', (req, res, next) => financeController.getMonthlyReport(req, res).catch(next));
router.get('/overdue-customers', (req, res, next) => financeController.getOverdueCustomers(req, res).catch(next));

router.get('/expenses', (req, res, next) => financeController.listExpenses(req, res).catch(next));
router.post('/expenses', (req, res, next) => financeController.createExpense(req, res).catch(next));
router.put('/expenses/:id', (req, res, next) => financeController.updateExpense(req, res).catch(next));
router.patch('/expenses/:id/pay', (req, res, next) => financeController.markExpenseAsPaid(req, res).catch(next));
router.delete('/expenses/:id', (req, res, next) => financeController.deleteExpense(req, res).catch(next));

export default router;
