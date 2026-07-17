// MFA controller. Setup/enable/disable run for an authenticated user; verify
// completes a login that is in the pending-MFA state. The TOTP secret is stored
// encrypted (AES-256-GCM); backup codes are stored only as argon2id hashes and
// are single-use.
const User = require('../models/user.model');
const mfa = require('../services/mfa.service');
const { encrypt, decrypt } = require('../services/crypto.service');
const { deviceHash } = require('../utils/deviceBinding');
const { logger } = require('../middleware/logger');

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

// Step 1: generate a secret, store it encrypted (not yet enabled), return a QR.
async function setup(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Not found' });

    const secret = mfa.generateSecret();
    user.mfaSecret = encrypt(secret);
    await user.save();

    const otpauth = mfa.keyUri(user.email, secret);
    const qr = await mfa.qrDataUrl(otpauth);
    // `secret` is returned for manual entry and shown once; never logged.
    return res.json({ qr, otpauth, secret });
  } catch (err) {
    return next(err);
  }
}

// Step 2: confirm a code, enable MFA, and issue one-time backup codes.
async function enable(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.mfaSecret) {
      return res.status(400).json({ error: 'Start MFA setup first' });
    }
    if (!mfa.verifyToken(req.body.code, decrypt(user.mfaSecret))) {
      return res.status(400).json({ error: 'Invalid code' });
    }
    const { plain, hashes } = await mfa.generateBackupCodes();
    user.mfaEnabled = true;
    user.mfaBackupCodes = hashes;
    await user.save();
    logger.info('auth.mfa.enabled', { userId: user._id.toString() });
    return res.json({ backupCodes: plain });
  } catch (err) {
    return next(err);
  }
}

// Completes a login sitting in the pending-MFA state (see auth.login).
async function verify(req, res, next) {
  try {
    const pendingId = req.session.pendingMfaUserId;
    if (!pendingId) return res.status(401).json({ error: 'No pending login' });

    const user = await User.findById(pendingId);
    if (!user) return res.status(401).json({ error: 'No pending login' });

    let ok = false;
    if (req.body.code) {
      ok = mfa.verifyToken(req.body.code, decrypt(user.mfaSecret));
    } else if (req.body.backupCode) {
      const idx = await mfa.findBackupCode(req.body.backupCode, user.mfaBackupCodes);
      if (idx >= 0) {
        ok = true;
        user.mfaBackupCodes.splice(idx, 1); // single-use
        await user.save();
      }
    }

    if (!ok) {
      logger.info('auth.mfa.fail', { userId: user._id.toString() });
      return res.status(401).json({ error: 'Invalid code' });
    }

    // Privilege change → fresh session id, then full authentication.
    await regenerateSession(req);
    req.session.userId = user._id.toString();
    req.session.role = user.role;
    req.session.deviceHash = deviceHash(req);
    req.session.createdAt = Date.now();
    logger.info('auth.mfa.success', { userId: user._id.toString() });
    return res.json({ id: user._id, email: user.email, role: user.role });
  } catch (err) {
    return next(err);
  }
}

async function disable(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.mfaEnabled) {
      return res.status(400).json({ error: 'MFA is not enabled' });
    }
    if (!mfa.verifyToken(req.body.code, decrypt(user.mfaSecret))) {
      return res.status(400).json({ error: 'Invalid code' });
    }
    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.mfaBackupCodes = [];
    await user.save();
    logger.info('auth.mfa.disabled', { userId: user._id.toString() });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { setup, enable, verify, disable };
