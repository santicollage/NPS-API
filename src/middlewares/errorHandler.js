export default function errorHandler(err, req, res, next) {
  console.error('🔥 Error capturado:', err);

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
  });
}
