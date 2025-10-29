import 'dotenv/config';
import app from './app.js';
import { ENV } from './config/env.js';
import cron from 'node-cron';
import { cleanupExpiredReservations } from './services/stock.service.js';

const PORT = ENV.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${ENV.PORT}`);
  console.log(`🌍 Environment: ${ENV.NODE_ENV}`);
  console.log(`📄 Docs: http://localhost:${ENV.PORT}/docs`);

  // Schedule cleanup of expired stock reservations every hour
  cron.schedule('0 * * * *', async () => {
    console.log(
      '🧹 Running scheduled cleanup of expired stock reservations...'
    );
    try {
      const result = await cleanupExpiredReservations();
      console.log(
        `✅ Cleanup completed: ${result.deletedCount} reservations deleted`
      );
    } catch (error) {
      console.error('❌ Error during scheduled cleanup:', error);
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
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
    case 'EADDRINUSE':
      console.error(`${bind} already in use`);
      process.exit(1);
    default:
      throw error;
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down server...');
  server.close(() => {
    console.log('Server closed.');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down server...');
  server.close(() => {
    console.log('Server closed.');
  });
});

export default server;
