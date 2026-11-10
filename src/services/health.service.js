import prisma from '../config/db.js';

export const checkDatabaseHealth = async () => {
  const startTime = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    return {
      healthy: true,
      responseTime: `${responseTime}ms`,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      healthy: false,
      responseTime: `${responseTime}ms`,
      error: error.message,
    };
  }
};
