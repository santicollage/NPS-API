const express = require('express');
const pingRoutes = require('./ping.routes');

const router = express.Router();

router.use('/ping', pingRoutes);

// Aquí se pueden agregar más rutas en el futuro
// router.use('/users', userRoutes);
// router.use('/products', productRoutes);

module.exports = router;
