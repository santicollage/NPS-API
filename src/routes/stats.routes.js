import express from 'express';
import * as statsController from '../controllers/stats.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply authentication and admin authorization to all stats routes
router.use(authenticateToken);
router.use(authorizeRoles(['admin']));

router.get('/summary', statsController.getSummary);
router.get('/sales', statsController.getSales);
router.get('/top-products', statsController.getTopProducts);
router.get('/customers', statsController.getCustomers);
router.get('/conversion', statsController.getConversion);
router.get('/purchase-time', statsController.getPurchaseTime);

export default router;
