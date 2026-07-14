// Auth controller. Every write builds the document from explicitly named,
// validated fields — never from req.body directly — so a client cannot set
// fields like `role` or `emailVerified` itself.
const User = require('../models/user.model');
const { hashPassword, verifyPassword } = require('../services/password.service');
const { deviceHash } = require('../utils/deviceBinding');
const { logger } = require('../middleware/logger');

// Promisified session.regenerate — issues a fresh session id so a pre-login
// session cookie cannot be fixed onto the authenticated session.
function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body; // already validated by zod

    const existing = await User.findOne({ email });
    if (existing) {
      // Generic message — do not confirm which emails are registered.
      return res.status(409).json({ error: 'Unable to register with those details' });
    }

    const passwordHash = await hashPassword(password);

    // Explicit whitelist — role/status/emailVerified default from the schema,
    // never accepted from the request.
    const user = await User.create({
      name,
      email,
      passwordHash,
      passwordHistory: [passwordHash],
      passwordChangedAt: new Date(),
    });

    logger.info('auth.register.success', { userId: user._id.toString() });
    return res.status(201).json({ id: user._id, email: user.email });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body; // validated by zod
    const user = await User.findOne({ email });

    // Generic failure — never reveal whether the email exists.
    const invalid = () =>
      res.status(401).json({ error: 'Invalid email or password' });

    if (!user) {
      logger.info('auth.login.fail', { userId: null, reason: 'no_user' });
      return invalid();
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) {
      logger.info('auth.login.fail', { userId: user._id.toString() });
      return invalid();
    }

    // Regenerate the session id on this privilege change (fixation defence),
    // then attach identity and the device-binding hash.
    await regenerateSession(req);
    req.session.userId = user._id.toString();
    req.session.role = user.role;
    req.session.deviceHash = deviceHash(req);
    req.session.createdAt = Date.now(); // anchor for the 24h absolute timeout

    logger.info('auth.login.success', { userId: user._id.toString() });
    return res.json({ id: user._id, email: user.email, role: user.role });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    const userId = req.session.userId;
    await new Promise((resolve, reject) =>
      req.session.destroy((err) => (err ? reject(err) : resolve()))
    );
    res.clearCookie('ecolend.sid');
    logger.info('auth.logout', { userId: userId || null });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.userId).select(
      'name email role emailVerified'
    );
    if (!user) return res.status(404).json({ error: 'Not found' });
    return res.json(user);
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, logout, me };
