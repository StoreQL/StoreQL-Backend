const ApiError = require('../utils/ApiError');

// 404 fallback for unmatched routes
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`No route: ${req.method} ${req.originalUrl}`));
}

// Converts any thrown error into a clean, consistent JSON shape.
// Raw stack traces / internals are never sent to the client.
function errorHandler(err, req, res, next) {
  const isApiError = err.isApiError === true;
  const statusCode = isApiError ? err.statusCode : 500;
  const message = isApiError ? err.message : 'Something went wrong. Please try again.';

  if (!isApiError) {
    console.error('[unhandled error]', err);
  }

  res.status(statusCode).json({
    error: {
      message,
      details: isApiError ? err.details : undefined,
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
