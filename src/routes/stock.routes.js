import express from 'express';
import {
  getMovements,
  createMovement,
  getReservations,
  cleanupReservations,
} from '../controllers/stock.controller.js';
import {
  authenticateToken,
  authorizeRoles,
} from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /stock/movements - Get stock movements history (admin only)
router.get(
  '/movements',
  authenticateToken,
  authorizeRoles(['admin']),
  getMovements
);

// POST /stock/movements - Create stock movement (admin only)
router.post(
  '/movements',
  authenticateToken,
  authorizeRoles(['admin']),
  createMovement
);

// GET /stock/reservations - List active reservations (admin only)
router.get(
  '/reservations',
  authenticateToken,
  authorizeRoles(['admin']),
  getReservations
);

// POST /stock/cleanup - Cleanup expired reservations (admin only)
router.post(
  '/cleanup',
  authenticateToken,
  authorizeRoles(['admin']),
  cleanupReservations
);

export default router;
