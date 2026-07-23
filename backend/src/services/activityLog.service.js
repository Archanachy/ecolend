// Structured activity logging to the activity_logs collection. Records only
// non-sensitive context — never passwords, hashes, MFA secrets, tokens, full
// card data, decrypted PII, or CSRF tokens. Failures here never break the
// request that triggered them.
const ActivityLog = require('../models/activityLog.model');
const { logger } = require('../middleware/logger');

async function logActivity({ userId = null, action, targetType, targetId, req, metadata = {} }) {
  try {
    await ActivityLog.create({
      userId,
      action,
      targetType,
      targetId,
      ip: req ? req.ip : undefined,
      userAgent: req ? req.headers['user-agent'] : undefined,
      metadata,
    });
  } catch (err) {
    logger.error('activity_log.error', { message: err.message });
  }
}

module.exports = { logActivity };
