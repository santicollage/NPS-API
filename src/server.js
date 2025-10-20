import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📄 Documentation available at http://localhost:${PORT}/docs`);
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
