// Auth controller. Every write builds the document from explicitly named,
// validated fields — never from req.body directly — so a client cannot set
// fields like `role` or `emailVerified` itself.
const User = require('../models/user.model');
const {
  hashPassword,
  verifyPassword,
  isPasswordReused,
  pushHistory,
} = require('../services/password.service');
const { createToken, verifyToken } = require('../services/token.service');
const { sendMail } = require('../services/email.service');
const { deviceHash } = require('../utils/deviceBinding');
const env = require('../config/env');
const { logger } = require('../middleware/logger');

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// A reset token embeds the account's passwordChangedAt at issue time; once the
// password changes this value no longer matches, making the token single-use.
function pwcStamp(user) {
  return user.passwordChangedAt ? user.passwordChangedAt.getTime() : 0;
}

async function sendVerificationEmail(user) {
  const token = createToken(
    { uid: user._id.toString(), purpose: 'verify_email' },
    VERIFY_TOKEN_TTL_MS
  );
  const link = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: user.email,
    subject: 'Verify your EcoLend email',
    text: `Welcome to EcoLend. Verify your email within 24 hours:\n${link}`,
  });
}

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

    await sendVerificationEmail(user);
    logger.info('auth.register.success', { userId: user._id.toString() });
    return res.status(201).json({ id: user._id, email: user.email });
  } catch (err) {
    return next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const payload = verifyToken(req.body.token, 'verify_email');
    if (!payload) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }
    await User.updateOne({ _id: payload.uid }, { $set: { emailVerified: true } });
    logger.info('auth.email.verified', { userId: payload.uid });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user && !user.emailVerified) {
      await sendVerificationEmail(user);
    }
    // Always generic — never reveal whether the email exists or is verified.
    return res.json({ ok: true });
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

async function forgotPassword(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const token = createToken(
        { uid: user._id.toString(), purpose: 'reset_password', pwc: pwcStamp(user) },
        RESET_TOKEN_TTL_MS
      );
      const link = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
      await sendMail({
        to: user.email,
        subject: 'Reset your EcoLend password',
        text: `Reset your password within 1 hour:\n${link}\nIf you did not request this, ignore this email.`,
      });
    }
    // Always generic — never reveal whether the email is registered.
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const invalid = () =>
      res.status(400).json({ error: 'Invalid or expired reset link' });

    const payload = verifyToken(token, 'reset_password');
    if (!payload) return invalid();

    const user = await User.findById(payload.uid);
    if (!user) return invalid();

    // Single-use: the stamp must still match the account's current one.
    if (String(payload.pwc) !== String(pwcStamp(user))) {
      return res.status(400).json({ error: 'This reset link has already been used' });
    }

    if (await isPasswordReused(password, user.passwordHistory)) {
      return res
        .status(400)
        .json({ error: 'Choose a password you have not used recently' });
    }

    const newHash = await hashPassword(password);
    user.passwordHash = newHash;
    user.passwordHistory = pushHistory(user.passwordHistory, newHash);
    user.passwordChangedAt = new Date();
    await user.save();

    logger.info('auth.password.reset', { userId: user._id.toString() });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  me,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};
