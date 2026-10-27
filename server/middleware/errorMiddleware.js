/**
 * CodeLens Centralized Error & 404 Middleware
 */

export const apiNotFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'API endpoint not found'
    }
  });
};

export const centralizedErrorHandler = (error, req, res, next) => {
  const status = error.status || (error.type === 'entity.too.large' ? 413 : error.code === 11000 ? 409 : 500);
  
  if (status >= 500 && !error.expose) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, error);
  }

  const message = (status >= 500 && !error.expose)
    ? 'Something went wrong. Please try again.'
    : error.code === 11000
      ? 'This email is already registered.'
      : (error.message || 'An unexpected error occurred.');

  res.status(status).json({ error: message });
};
