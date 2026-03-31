import logger from '../utils/logger.js';
import { ENV } from '../config/env.js';
import { Prisma } from '@prisma/client';

const handlePrismaError = (error) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          statusCode: 409,
          message: `Duplicate value for ${error.meta?.target?.join(', ') || 'field'}`,
        };
      case 'P2025':
        return {
          statusCode: 404,
          message: 'Record not found',
        };
      case 'P2003':
        return {
          statusCode: 400,
          message: 'Foreign key constraint failed',
        };
      default:
        return {
          statusCode: 400,
          message: 'Database operation failed',
        };
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: 400,
      message: 'Invalid data provided',
    };
  }

  return null;
};

export default function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error with context
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.user_id,
    ip: req.ip,
    statusCode: err.statusCode || err.status || 500,
    isOperational: err.isOperational || false,
    timestamp: new Date().toISOString(),
  });

  // Handle Prisma errors
  const prismaError = handlePrismaError(err);
  if (prismaError) {
    error.statusCode = prismaError.statusCode;
    error.message = prismaError.message;
  }

  // Handle OpenAPI validation errors
  if (err.status && err.errors) {
    return res.status(err.status).json({
      status: 'fail',
      message: err.message || 'Validation error',
      errors: err.errors,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Token expired',
    });
  }

  // Default error response
  const statusCode = error.statusCode || err.status || 500;
  const message =
    error.message || 'Internal Server Error. Please try again later.';

  const response = {
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
  };

  if (ENV.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.error = err;
  }

  res.status(statusCode).json(response);
}
