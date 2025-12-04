import { PrismaClient } from '@prisma/client';
import { ENV } from './env.js';

const prisma = new PrismaClient({
  datasources: {
    db: { url: ENV.DATABASE_URL },
  },
  log: ['error', 'warn'],
});

export default prisma;
