// Activity log. Records non-sensitive context only — never passwords, hashes,
// MFA secrets, session tokens, full card data, decrypted PII, or CSRF tokens.
// userId is nullable for pre-auth events (e.g. failed login on unknown email).
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: { type: String, required: true, index: true },
    targetType: { type: String }, // 'user' | 'listing' | 'booking' | 'review'
    targetId: { type: mongoose.Schema.Types.ObjectId },
    ip: { type: String },
    userAgent: { type: String },
    metadata: { type: Object, default: {} }, // non-sensitive context only
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
