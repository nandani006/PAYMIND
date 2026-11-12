/**
 * Global Express error handler.
 * Normalises errors into a consistent JSON response.
 */
function errorHandler(err, req, res, next) {
  // Joi validation errors
  if (err.name === 'ValidationError' && err.isJoi) {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.details.map(d => ({ field: d.context?.key, message: d.message })),
    });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      message: 'A record with this identifier or value already exists.',
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referenced record does not exist.' });
  }

  // CSRF errors
  if (err.code === 'EBADCSRFTOKEN' || err.message?.includes('csrf')) {
    return res.status(403).json({ message: 'Invalid CSRF token.' });
  }

  // Axios errors (AI service, PayPal)
  if (err.isAxiosError) {
    console.error('[External Service Error]', err.config?.url, err.response?.status, err.response?.data);
    return res.status(502).json({ message: 'External service error. Please try again.' });
  }

  // Log unexpected errors
  console.error('[Server Error]', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  res.status(statusCode).json({ message });
}

module.exports = errorHandler;
