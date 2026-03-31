import express from 'express';
import {
  healthCheck,
  readinessCheck,
  livenessCheck,
} from '../controllers/health.controller.js';

const router = express.Router();

// GET /health - Detailed health check
router.get('/', healthCheck);

// HEAD /health - Lightweight health check (for monitoring apps)
router.head('/', (req, res) => res.status(200).end());

// GET /health/ready - Readiness probe (for Kubernetes)
router.get('/ready', readinessCheck);

// GET /health/live - Liveness probe (for Kubernetes)
router.get('/live', livenessCheck);

export default router;
