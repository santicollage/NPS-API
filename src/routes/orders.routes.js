import express from 'express';
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatusController,
} from '../controllers/orders.controller.js';
import {
  authenticateToken,
  authorizeRoles,
} from '../middlewares/auth.middleware.js';

const router = express.Router();

// POST /orders - Create order from cart
router.post('/', authenticateToken, createOrder);

// GET /orders - List user orders (or all if admin)
router.get('/', authenticateToken, getOrders);

// GET /orders/:order_id - Get order details
router.get('/:order_id', authenticateToken, getOrder);

// PATCH /orders/:order_id/status - Update order status (admin only)
router.patch(
  '/:order_id/status',
  authenticateToken,
  authorizeRoles(['admin']),
  updateOrderStatusController
);

export default router;
