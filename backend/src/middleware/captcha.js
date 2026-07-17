// CAPTCHA verification (hCaptcha), per spec 05 §Brute-force prevention:
//   - required on /register ALWAYS
//   - required on /login after 3 failed attempts on the same account
//
// The token arrives as `captchaToken` in the body; it is stashed onto the
// request and removed before zod runs, so the strict schemas (which reject
// unknown fields as the mass-assignment defence) still pass.
//
// There is no "no key configured" bypass: if the secret is missing the request
// is refused (fail closed). The automated test suite is the only exemption —
// it must not make outbound network calls — and that is keyed on NODE_ENV.
const User = require('../models/user.model');
const env = require('../config/env');
const { logger } = require('./logger');

const VERIFY_URL = 'https://hcaptcha.com/siteverify';
// Spec: CAPTCHA kicks in on /login after this many consecutive failures.
const CAPTCHA_AFTER_FAILURES = 3;

// The suite must not make outbound network calls, so enforcement is skipped
// under NODE_ENV=test unless a test explicitly opts in (and stubs the verifier
// via `exports.isTokenValid`), which is how the control itself is covered.
const isTest = () =>
  process.env.NODE_ENV === 'test' && process.env.CAPTCHA_ENFORCE_IN_TEST !== '1';

// Move captchaToken off the body so `.strict()` schemas don't reject it.
function stashCaptchaToken(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.captchaToken = req.body.captchaToken;
    delete req.body.captchaToken;
  }
  return next();
}

// Returns true only when the provider confirms the token.
async function isTokenValid(token, ip) {
  const secret = env.captcha.secretKey;
  if (!secret || !token) return false;
  const params = new URLSearchParams({ secret, response: token });
  if (ip) params.append('remoteip', ip);
  const resp = await fetch(VERIFY_URL, { method: 'POST', body: params });
  const data = await resp.json();
  return Boolean(data.success);
}

// Shared handler: verify, or reject with a consistent shape.
async function enforce(req, res, next) {
  if (!env.captcha.secretKey) {
    // Misconfiguration — fail closed rather than silently allowing.
    logger.error('captcha.not_configured', { path: req.path });
    return res.status(500).json({ error: 'CAPTCHA is not configured on the server' });
  }
  if (!req.captchaToken) {
    return res.status(400).json({ error: 'CAPTCHA is required', captchaRequired: true });
  }
  try {
    // Called via module.exports so tests can substitute the provider call.
    const ok = await module.exports.isTokenValid(req.captchaToken, req.ip);
    if (!ok) {
      return res.status(400).json({ error: 'CAPTCHA verification failed', captchaRequired: true });
    }
    return next();
  } catch (err) {
    logger.error('captcha.error', { message: err.message });
    return res.status(502).json({ error: 'CAPTCHA service unavailable' });
  }
}

// Always required (registration).
async function requireCaptcha(req, res, next) {
  if (isTest()) return next();
  return enforce(req, res, next);
}

// Required only once the account has accumulated failed logins (spec: 3+).
// Looked up by the submitted email; when the account does not exist no CAPTCHA
// is demanded, so this adds no user-enumeration oracle beyond the existing
// `captchaRequired` hint already returned on failed logins.
async function requireCaptchaAfterFailures(req, res, next) {
  if (isTest()) return next();
  try {
    const email = req.body && req.body.email;
    if (!email) return next();
    const user = await User.findOne({ email }).select('failedLoginAttempts');
    if (!user || (user.failedLoginAttempts || 0) < CAPTCHA_AFTER_FAILURES) return next();
    return enforce(req, res, next);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  stashCaptchaToken,
  requireCaptcha,
  requireCaptchaAfterFailures,
  isTokenValid, // overridable in tests
  CAPTCHA_AFTER_FAILURES,
};
