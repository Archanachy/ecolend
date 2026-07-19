// In-app notifications. Every query is scoped to req.userId (from the session),
// so a user can only ever read or mutate their own notifications.
const mongoose = require('mongoose');
const Notification = require('../models/notification.model');

// GET /api/notifications — recent notifications + unread count.
async function listNotifications(req, res, next) {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const [items, unread] = await Promise.all([
      Notification.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ userId: req.userId, read: false }),
    ]);
    return res.json({ items, unread });
  } catch (err) {
    return next(err);
  }
}

// GET /api/notifications/unread-count — cheap poll for the navbar badge.
async function unreadCount(req, res, next) {
  try {
    const unread = await Notification.countDocuments({ userId: req.userId, read: false });
    return res.json({ unread });
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/notifications/:id/read
async function markRead(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Not found' });
    }
    // Scoped by userId so one user can never mark another's notification.
    const result = await Notification.updateOne(
      { _id: req.params.id, userId: req.userId },
      { $set: { read: true } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/notifications/read-all
async function markAllRead(req, res, next) {
  try {
    await Notification.updateMany({ userId: req.userId, read: false }, { $set: { read: true } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listNotifications, unreadCount, markRead, markAllRead };
