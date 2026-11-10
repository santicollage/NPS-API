import { checkDatabaseHealth } from '../services/health.service.js';
import logger from '../utils/logger.js';
import * as cache from '../config/cache.js';

export const healthCheck = async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();

    const healthStatus = {
      status: dbHealth.healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbHealth.healthy ? 'connected' : 'disconnected',
        api: 'running',
      },
      details: {
        database: {
          status: dbHealth.healthy ? 'ok' : 'error',
          responseTime: dbHealth.responseTime,
          ...(dbHealth.error && { error: dbHealth.error }),
        },
        memory: {
          used:
            Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) /
            100,
          total:
            Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) /
            100,
          unit: 'MB',
        },
        process: {
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform,
        },
      },
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    if (statusCode === 503) {
      logger.warn('Health check failed', healthStatus);
    }

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check error:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
};

export const readinessCheck = async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();

    if (dbHealth.healthy) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database not available',
      });
    }
  } catch (error) {
    logger.error('Readiness check error:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
};

export const livenessCheck = (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Cache statistics endpoint
 */
export const cacheStats = (req, res) => {
  try {
    const stats = cache.getStats();

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      cache: {
        keys: stats.keys,
        hits: stats.hits,
        misses: stats.misses,
        hitRate:
          stats.hits > 0
            ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) +
              '%'
            : '0%',
        ksize: stats.ksize,
        vsize: stats.vsize,
      },
    });
  } catch (error) {
    logger.error('Cache stats error:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to retrieve cache statistics',
    });
  }
};
