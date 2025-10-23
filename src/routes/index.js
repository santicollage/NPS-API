import express from 'express';
import pingRoutes from './ping.routes.js';
import userRoutes from './users.routes.js';
import authRoutes from './auth.routes.js';

const router = express.Router();

router.use('/v1/ping', pingRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/auth', authRoutes);

export default router;
