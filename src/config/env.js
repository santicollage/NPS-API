import dotenv from 'dotenv';

dotenv.config();

function required(name, fallback = null) {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`❌ Missing required environment variable: ${name}`);
  }
  return value;
}

export const ENV = {
  // Environment and server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,

  // Security and middlewares
  COOKIE_SECRET: required('COOKIE_SECRET'),
  CORS_ORIGINS: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((url) => url.trim())
    : ['http://localhost:5173'],

  // PostgreSQL database
  DATABASE_URL: required('DATABASE_URL'),
  POSTGRES_DB: process.env.POSTGRES_DB,
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,

  // JWT
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Google OAuth
  GOOGLE_CLIENT_ID: required('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: required('GOOGLE_CLIENT_SECRET'),

  // PayU Payment Gateway
  PAYU_MERCHANT_ID: required('PAYU_MERCHANT_ID'),
  PAYU_ACCOUNT_ID: required('PAYU_ACCOUNT_ID'),
  PAYU_API_KEY: required('PAYU_API_KEY'),
  PAYU_API_LOGIN: required('PAYU_API_LOGIN'),
  PAYU_ENVIRONMENT: process.env.PAYU_ENVIRONMENT || 'sandbox',
  PAYU_API_URL:
    process.env.PAYU_API_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://api.payulatam.com/payments-api/4.0/service.cgi'
      : 'https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi'),

  // Frontend URL (for payment redirects)
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Email Service (Brevo)
  BREVO_API_KEY: required('BREVO_API_KEY'),
  EMAIL_SENDER: required('EMAIL_SENDER'),
  EMAIL_SENDER_NAME: required('EMAIL_SENDER_NAME'),
  ADMIN_EMAIL: required('ADMIN_EMAIL'),
};

console.log('🤫 Environment variables loaded successfully.');
