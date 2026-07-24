// EcoLend backend — Express app assembly.
// Security middleware and routes are wired here; the HTTP server and DB
// connection live in server.js so the app stays importable in tests.
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const { sessionMiddleware } = require('./config/session');
const { requestLogger } = require('./middleware/logger');
const { globalWriteLimiter } = require('./middleware/rateLimiter');
const { issueCsrfToken, verifyCsrf } = require('./middleware/csrf');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security headers with an explicit, restrictive CSP. Script sources are
// limited to this origin plus hCaptcha (which the CAPTCHA widget requires);
// everything else falls back to helmet's secure defaults.
const HCAPTCHA = ['https://hcaptcha.com', 'https://*.hcaptcha.com'];
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", ...HCAPTCHA],
        'frame-src': ["'self'", ...HCAPTCHA],
        'connect-src': ["'self'", ...HCAPTCHA],
        // hCaptcha injects inline styles for its widget.
        'style-src': ["'self'", "'unsafe-inline'", ...HCAPTCHA],
        'img-src': ["'self'", 'data:', 'https:'],
        'object-src': ["'none'"],
        'frame-ancestors': ["'self'"],
      },
    },
  })
);
app.disable('x-powered-by');
app.set('trust proxy', 1); // correct client IPs behind a reverse proxy

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(sessionMiddleware());
app.use(requestLogger);

// Platform-wide throttle on state-changing requests (skipped in tests).
app.use((req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    return globalWriteLimiter(req, res, next);
  }
  return next();
});

// CSRF: issue a token cookie on every request, verify it on state-changing ones.
app.use(issueCsrfToken);
app.use(verifyCsrf);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/captcha/config', (req, res) => {
  if (!env.captcha.siteKey) {
    return res.status(500).json({ error: 'CAPTCHA is not configured on the server' });
  }
  return res.status(200).json({ siteKey: env.captcha.siteKey });
});

// Feature routers.
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/listings', require('./routes/listing.routes'));
app.use('/api/bookings', require('./routes/booking.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/favorites', require('./routes/favorite.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
