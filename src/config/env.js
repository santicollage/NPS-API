import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'COOKIE_SECRET',
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'PAYU_MERCHANT_ID',
  'PAYU_ACCOUNT_ID',
  'PAYU_API_KEY',
  'PAYU_API_LOGIN',
  'BREVO_API_KEY',
  'EMAIL_SENDER',
  'EMAIL_SENDER_NAME',
  'ADMIN_EMAIL',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_BUCKET_NAME',
  'S3_REGION'
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`❌ Missing critical env var: ${varName}`);
  }
}

export const ENV = {
  // Environment and server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,

  // Security and middlewares
  COOKIE_SECRET: process.env.COOKIE_SECRET,
  CORS_ORIGINS: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((url) => url.trim())
    : ['http://localhost:5173'],

  // PostgreSQL database
  DATABASE_URL: process.env.DATABASE_URL,
  POSTGRES_DB: process.env.POSTGRES_DB,
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

  // PayU Payment Gateway
  PAYU_MERCHANT_ID: process.env.PAYU_MERCHANT_ID,
  PAYU_ACCOUNT_ID: process.env.PAYU_ACCOUNT_ID,
  PAYU_API_KEY: process.env.PAYU_API_KEY,
  PAYU_API_LOGIN: process.env.PAYU_API_LOGIN,
  PAYU_ENVIRONMENT: process.env.PAYU_ENVIRONMENT || 'sandbox',
  PAYU_API_URL:
    process.env.PAYU_API_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://api.payulatam.com/payments-api/4.0/service.cgi'
      : 'https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi'),

  // Frontend URL (for payment redirects)
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Email Service (Brevo)
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  EMAIL_SENDER: process.env.EMAIL_SENDER,
  EMAIL_SENDER_NAME: process.env.EMAIL_SENDER_NAME,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,

  // AWS S3
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  S3_REGION: process.env.S3_REGION,
};

console.log('🤫 Environment variables loaded successfully.');
