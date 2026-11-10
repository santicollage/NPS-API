/**
 * Shared shutdown state — imported by app.js and server.js
 * to coordinate graceful shutdown across the application.
 */

const shutdownState = {
  isShuttingDown: false,
  activeRequests: 0,
};

export default shutdownState;
