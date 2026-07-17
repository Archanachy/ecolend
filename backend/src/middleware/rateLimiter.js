// Rate limiting (express-rate-limit). Thresholds come straight from the security
// spec. Limiters are skipped under NODE_ENV=test so the integration suite (many
// requests from one loopback IP) isn't throttled; the limiter behaviour itself
// is covered by a dedicated test that runs with limiting enabled.
const rateLimit = require('express-rate-limit');
const { isBlocked } = require('../utils/ipTracker');

const skip = () => process.env.NODE_ENV === 'test';

// Rejects requests from an IP that has been temporarily blocked for repeated
// failed logins (see ipTracker). Always active — this is an abuse block, not a
// throughput limit, so it is not skipped in tests.
function ipBlockGuard(req, res, next) {
  if (isBlocked(req.ip)) {
    return res
      .status(429)
      .json({ error: 'Too many failed attempts from your network. Try again later.' });
  }
  return next();
}
const tooMany = { error: 'Too many requests, please try again later.' };

// Login: 10 requests / 5 minutes / IP.
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
  skip,
});

// Registration and password-reset requests: 5 / 15 minutes / IP.
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
  skip,
});

// Platform-wide guard on state-changing requests: 60 / minute / IP.
const globalWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
  skip,
});

module.exports = {
  loginLimiter,
  sensitiveLimiter,
  globalWriteLimiter,
  ipBlockGuard,
};
