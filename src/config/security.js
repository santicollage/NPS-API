import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { ENV } from './env.js';

export default function setupSecurity(app) {
  const allowedOrigins = ENV.CORS_ORIGINS;

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      frameguard: { action: 'deny' },
      hsts:
        ENV.NODE_ENV === 'production'
          ? {
              maxAge: 31536000,
              includeSubDomains: true,
              preload: true,
            }
          : false,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS: origen no permitido'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100, // limit of 100 requests per windowMs
    message: {
      status: 429,
      error: 'Too many requests, please try again later.',
    },
  });
  app.use(limiter);

  app.use(morgan(ENV.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(cookieParser(ENV.COOKIE_SECRET));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  console.log('🔒 Security middlewares loaded correctly.');
}
