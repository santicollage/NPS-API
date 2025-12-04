import express from 'express';
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatusController,
  createGuestOrder,
  getGuestOrder,
} from '../controllers/orders.controller.js';
import {
  authenticateToken,
  authorizeRoles,
} from '../middlewares/auth.middleware.js';

const router = express.Router();

// Authenticated user routes
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

// Guest routes (no authentication required)
// POST /orders/guest - Create guest order from cart
router.post('/guest', createGuestOrder);

// GET /orders/guest/:order_token - Get guest order by token
router.get('/guest/:order_token', getGuestOrder);

export default router;
