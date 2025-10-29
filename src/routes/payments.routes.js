import express from 'express';
import {
  createPaymentController,
  processWebhookController,
  getPaymentStatus,
} from '../controllers/payments.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// POST /payments/create - Create payment transaction
router.post('/create', createPaymentController);

// POST /payments/webhook - Process payment webhook (no auth for webhooks)
router.post('/webhook', processWebhookController);

// GET /payments/:order_id - Get payment status for order
router.get('/:order_id', authenticateToken, getPaymentStatus);

export default router;
