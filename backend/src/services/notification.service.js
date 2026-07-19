// Booking notifications. A single entry point (`notifyUser`) fans out to two
// independent channels, each honouring its own preference:
//   - email      -> notificationPrefs.email
//   - in-app     -> notificationPrefs.inApp  (Notification documents)
// Best-effort throughout: a failure here must never block or fail the action
// that triggered it.
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const env = require('../config/env');
const { sendMail } = require('./email.service');

function bookingUrl(id) {
  return `${env.appUrl}/bookings/${id}`;
}

/**
 * @param {string} userId   recipient
 * @param {string} subject  email subject / in-app headline
 * @param {string} text     email body
 * @param {object} [opts]   { link, type } for the in-app notification
 */
async function notifyUser(userId, subject, text, opts = {}) {
  try {
    const user = await User.findById(userId).select('email notificationPrefs');
    if (!user) return;
    const prefs = user.notificationPrefs || {};

    // Both default to opt-in (schema default true); only skip when explicitly false.
    const tasks = [];
    if (prefs.email !== false) {
      tasks.push(sendMail({ to: user.email, subject, text }));
    }
    if (prefs.inApp !== false) {
      tasks.push(
        Notification.create({
          userId,
          type: opts.type || 'booking',
          message: subject,
          link: opts.link || '',
        })
      );
    }
    await Promise.allSettled(tasks);
  } catch {
    // Notifications are non-critical; swallow errors.
  }
}

module.exports = { notifyUser, bookingUrl };
