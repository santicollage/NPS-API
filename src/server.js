import 'dotenv/config';
import app from './app.js';
import { ENV } from './config/env.js';
import cron from 'node-cron';
import { cleanupExpiredReservations } from './services/stock.service.js';
import logger from './utils/logger.js';

const PORT = ENV.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${ENV.PORT}`);
  logger.info(`🌍 Environment: ${ENV.NODE_ENV}`);
  logger.info(`📄 Docs: http://localhost:${ENV.PORT}/docs`);

  // Schedule cleanup of expired stock reservations every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.info(
      '🧹 Running scheduled cleanup of expired stock reservations...'
    );
    try {
      const result = await cleanupExpiredReservations();
      logger.info(
        `✅ Cleanup completed: ${result.deletedCount} reservations deleted`
      );
    } catch (error) {
      logger.error('❌ Error during scheduled cleanup:', {
        error: error.message,
        stack: error.stack,
      });
    }
  });
});

server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
    case 'EADDRINUSE':
      logger.error(`${bind} already in use`);
      process.exit(1);
    default:
      throw error;
  }
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down server...');
  server.close(() => {
    logger.info('Server closed.');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down server...');
  server.close(() => {
    logger.info('Server closed.');
  });
});

export default server;
