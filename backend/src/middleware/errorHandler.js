// Central error handler. Never leaks stack traces or internal detail to the
// client — logs the full error server-side, returns a clean JSON message.
const { logger } = require('./logger');

// Route-not-found handler (mount after all routes).
function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature.
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  logger.error('unhandled_error', {
    message: err.message,
    status,
    path: req.originalUrl,
  });
  const body = { error: status === 500 ? 'Internal server error' : err.message };
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
