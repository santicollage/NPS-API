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
};

console.log('🤫 Environment variables loaded successfully.');
