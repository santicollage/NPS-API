import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: {
      message: 'Too many authentication attempts, please try again after 15 minutes',
      status: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 password reset requests per windowMs
  message: {
    error: {
      message: 'Too many password reset requests, please try again after 15 minutes',
      status: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createOrderLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 order creation requests per minute
  message: {
    error: {
      message: 'Too many order creation attempts, please try again in a minute',
      status: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
