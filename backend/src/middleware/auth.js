// Authentication guard. Confirms a real session exists, enforces the 24-hour
// absolute session lifetime (the rolling cookie only covers idle timeout), and
// checks the device binding. Identity is read from the server-side session
// only — never from anything the client sends.
const { ABSOLUTE_TIMEOUT_MS } = require('../config/session');
const { deviceHash } = require('../utils/deviceBinding');
const SecurityAlert = require('../models/securityAlert.model');
const User = require('../models/user.model');
const { logger } = require('./logger');

function destroy(req) {
  return new Promise((resolve) => req.session.destroy(() => resolve()));
}

async function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const age = Date.now() - (req.session.createdAt || 0);
  if (age > ABSOLUTE_TIMEOUT_MS) {
    await destroy(req);
    res.clearCookie('ecolend.sid');
    return res.status(401).json({ error: 'Session expired' });
  }

  // Device binding: if the User-Agent + IP-prefix hash no longer matches the
  // one captured at login, raise a new-device alert and force re-authentication.
  if (req.session.deviceHash && req.session.deviceHash !== deviceHash(req)) {
    const userId = req.session.userId;
    await SecurityAlert.create({
      type: 'new_device_login',
      userId,
      detail: 'Session used from a new device/network; re-authentication required',
    }).catch(() => {});
    logger.info('security.new_device', { userId });
    await destroy(req);
    res.clearCookie('ecolend.sid');
    return res.status(401).json({ error: 'Please sign in again' });
  }

  req.userId = req.session.userId;
  req.role = req.session.role;
  return next();
}

// Gate for actions that require a verified email address (listing an item,
// requesting a booking). Runs after requireAuth.
async function requireVerifiedEmail(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('emailVerified');
    if (!user || !user.emailVerified) {
      return res.status(403).json({
        error: 'Please verify your email address before doing this.',
        emailVerificationRequired: true,
      });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

// Spec 05 (MFA): "MFA is not optional for Admin accounts." An admin without
// two-factor enabled is refused every admin capability until they enrol. The
// enrolment endpoints live outside /api/admin, so this never locks them out of
// the fix — they can still reach /auth/mfa/setup and /auth/mfa/enable.
async function requireAdminMfa(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('mfaEnabled');
    if (!user || !user.mfaEnabled) {
      return res.status(403).json({
        error: 'Admin accounts must enable two-factor authentication.',
        mfaSetupRequired: true,
      });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth, requireVerifiedEmail, requireAdminMfa };
