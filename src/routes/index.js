import express from 'express';
import pingRoutes from './ping.routes.js';
import userRoutes from './users.routes.js';
import authRoutes from './auth.routes.js';
import categoryRoutes from './categories.routes.js';
import productRoutes from './products.routes.js';
import cartRoutes from './cart.routes.js';
import stockRoutes from './stock.routes.js';
import orderRoutes from './orders.routes.js';
import paymentRoutes from './payments.routes.js';
import jobRoutes from './jobs.routes.js';

const router = express.Router();

router.use('/v1/ping', pingRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/auth', authRoutes);
router.use('/v1/categories', categoryRoutes);
router.use('/v1/products', productRoutes);
router.use('/v1/cart', cartRoutes);
router.use('/v1/stock', stockRoutes);
router.use('/v1/orders', orderRoutes);
router.use('/v1/payments', paymentRoutes);
router.use('/v1/jobs', jobRoutes);

export default router;
