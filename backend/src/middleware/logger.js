// Structured request logging with winston. Logs only non-sensitive request
// metadata — never bodies, passwords, tokens, or cookies.
const winston = require('winston');
const env = require('../config/env');

const logger = winston.createLogger({
  level: env.isProd ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Express middleware: log method, path, status, and duration per request.
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
    });
  });
  next();
}

module.exports = { logger, requestLogger };
