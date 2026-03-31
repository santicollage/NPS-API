import logger from '../utils/logger.js';
import { ENV } from '../config/env.js';

export default function errorHandler(err, req, res, next) {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.user_id,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  if (err.status && err.errors) {
    return res.status(err.status).json({
      status: err.status,
      message: err.message || 'Validation error',
      errors: err.errors,
    });
  }

  const statusCode = err.status || 500;
  const message =
    err.message || 'Internal Server Error. Please try again later.';

  res.status(statusCode).json({
    status: statusCode,
    message,
    ...(ENV.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
