// In-app notifications. Written alongside (and independently of) email, so a
// user who opts out of email still sees activity in the app. Never contains
// sensitive data — only a short message and a relative link.
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['booking', 'payment', 'review', 'system'],
      default: 'booking',
    },
    message: { type: String, required: true, maxlength: 300 },
    // Relative in-app path (e.g. /bookings/<id>) — never an external URL.
    link: { type: String, default: '' },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
