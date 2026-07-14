// Auth controller. Every write builds the document from explicitly named,
// validated fields — never from req.body directly — so a client cannot set
// fields like `role` or `emailVerified` itself.
const User = require('../models/user.model');
const { hashPassword } = require('../services/password.service');
const { logger } = require('../middleware/logger');

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

module.exports = { register };
