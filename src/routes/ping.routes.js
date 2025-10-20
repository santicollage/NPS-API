import express from 'express';
import { ENV } from '../config/env.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    env: ENV.NODE_ENV || 'development',
  });
});

export default router;
