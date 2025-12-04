import express from 'express';
import {
  getHealth,
  cleanupReservationsController,
} from '../controllers/jobs.controller.js';
import {
  authenticateToken,
  authorizeRoles,
} from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /jobs/health - Get system health status (admin only)
router.get('/health', authenticateToken, authorizeRoles(['admin']), getHealth);

// POST /jobs/cleanup-reservations - Manual cleanup of expired reservations (admin only)
router.post(
  '/cleanup-reservations',
  authenticateToken,
  authorizeRoles(['admin']),
  cleanupReservationsController
);

export default router;
