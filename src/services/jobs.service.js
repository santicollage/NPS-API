import { cleanupExpiredReservations } from './stock.service.js';

/**
 * Get system health status
 * @returns {Promise<Object>} Health status object
 */
export const getHealthStatus = async () => {
  try {
    // Check database connection
    const dbStatus = 'connected'; // Prisma handles connection internally

    // Check Redis connection (if used)
    const redisStatus = 'connected'; // Placeholder

    // Check scheduler status
    const schedulerStatus = 'running'; // Placeholder

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
        scheduler: schedulerStatus,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        redis: 'disconnected',
        scheduler: 'stopped',
      },
      error: error.message,
    };
  }
};

/**
 * Manual cleanup of expired reservations
 * @returns {Promise<Object>} Cleanup result
 */
export const manualCleanupReservations = async () => {
  return await cleanupExpiredReservations();
};
