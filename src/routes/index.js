import express from 'express';
import pingRoutes from './ping.routes.js';

const router = express.Router();

router.use('/v1/ping', pingRoutes);

// Aquí se pueden agregar más rutas en el futuro
// router.use('/users', userRoutes);
// router.use('/products', productRoutes);

export default router;
