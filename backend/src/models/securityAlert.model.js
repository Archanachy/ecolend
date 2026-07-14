// Security alert. Written by the rule-based monitoring triggers (repeated
// failed logins, new-device login, IP rate-limit) and surfaced on the admin
// alerts page. Not a modelled anomaly system — simple deterministic rules.
const mongoose = require('mongoose');

const securityAlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['repeated_failed_login', 'new_device_login', 'rate_limit_triggered'],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    detail: { type: String, default: '' },
    acknowledged: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('SecurityAlert', securityAlertSchema);
