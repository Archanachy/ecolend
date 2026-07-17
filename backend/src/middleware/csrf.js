// CSRF protection via the double-submit cookie pattern, implemented directly
// (the `csurf` package is deprecated/unmaintained; this avoids that dependency
// while keeping the same defence). A random token is set in a JS-readable cookie
// on safe requests; the SPA echoes it in the X-CSRF-Token header on every
// state-changing request, and the server checks the two match. A cross-site
// attacker can neither read the cookie (same-origin policy) nor set the header,
// so forged requests fail. This layers on top of the SameSite=Strict session
// cookie. Skipped under NODE_ENV=test (covered by a dedicated test).
const crypto = require('crypto');
const env = require('../config/env');

const CSRF_COOKIE = 'csrfToken';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Issues a token cookie if one isn't present. httpOnly is intentionally false so
// the frontend can read it and echo it in the header.
function issueCsrfToken(req, res, next) {
  let token = req.cookies && req.cookies[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: env.isProd,
      sameSite: 'strict',
      path: '/',
    });
  }
  req.csrfToken = token;
  next();
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (process.env.NODE_ENV === 'test') return next();

  const cookieToken = req.cookies && req.cookies[CSRF_COOKIE];
  const headerToken = req.get('X-CSRF-Token');
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  return next();
}

module.exports = { issueCsrfToken, verifyCsrf, CSRF_COOKIE };
