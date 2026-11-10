import 'dotenv/config';
import app from './app.js';
import { ENV } from './config/env.js';
import cron from 'node-cron';
import { cleanupExpiredReservations } from './services/stock.service.js';
import logger from './utils/logger.js';
import prisma from './config/db.js';
import cache from './config/cache.js';
import shutdownState from './config/shutdown.js';

const PORT = ENV.PORT || 3000;


// ─── Socket Tracking ─────────────────────────────────────────
const sockets = new Set();

// ─── Cron State ──────────────────────────────────────────────
let cronRunning = false;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${ENV.PORT}`);
  logger.info(`🌍 Environment: ${ENV.NODE_ENV}`);
  logger.info(`📄 Docs: http://localhost:${ENV.PORT}/docs`);
});

// Track connected sockets for forced cleanup during shutdown
server.on('connection', (socket) => {
  sockets.add(socket);

  socket.on('close', () => {
    sockets.delete(socket);
  });
});

// Schedule cleanup of expired stock reservations every 15 minutes
const cronTask = cron.schedule('*/15 * * * *', async () => {
  if (shutdownState.isShuttingDown) return;

  cronRunning = true;

  try {
    logger.info('🧹 Running scheduled cleanup of expired stock reservations...');
    const result = await cleanupExpiredReservations();
    logger.info(`✅ Cleanup completed: ${result.cleaned_reservations} reservations deleted`);
  } catch (error) {
    logger.error('❌ Error during scheduled cleanup:', {
      error: error.message,
      stack: error.stack,
    });
  } finally {
    cronRunning = false;
  }
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

// ─── Graceful Shutdown ───────────────────────────────────────

async function gracefulShutdown(signal) {
  logger.info(`⚠️ ${signal} received. Starting graceful shutdown...`);

  if (shutdownState.isShuttingDown) return; // prevent double execution
  shutdownState.isShuttingDown = true;

  // ⛔ 1. Stop accepting new connections
  server.close(() => {
    logger.info('🚫 HTTP server stopped accepting new connections');
  });

  // ⛔ 2. Destroy keep-alive sockets after 5 seconds
  setTimeout(() => {
    sockets.forEach((socket) => socket.destroy());
    logger.info('🔌 All sockets destroyed');
  }, 5000);

  // ⛔ 3. Wait for active requests to drain (max 8s)
  const waitForRequests = async () => {
    const start = Date.now();

    while (shutdownState.activeRequests > 0) {
      if (Date.now() - start > 8000) {
        logger.warn(`⚠️ Timeout waiting for ${shutdownState.activeRequests} active request(s)`);
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  };

  await waitForRequests();
  logger.info('✅ Active requests drained');

  // ⛔ 4. Stop cron and wait for in-flight execution (max 5s)
  cronTask.stop();

  const waitForCron = async () => {
    const start = Date.now();

    while (cronRunning) {
      if (Date.now() - start > 5000) {
        logger.warn('⚠️ Timeout waiting for cron job');
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  };

  await waitForCron();
  logger.info('✅ Cron stopped');

  // ⛔ 5. Close cache timers
  cache.close();
  logger.info('✅ Cache closed');

  // ⛔ 6. Disconnect database (only safe after all requests drained)
  await prisma.$disconnect();
  logger.info('✅ DB disconnected');

  logger.info('🏁 Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Catch Unhandled Errors ──────────────────────────────────

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

export default server;
