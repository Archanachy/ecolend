// Admin controller. Every handler here runs behind requireRole('admin') (see
// the route file) — a second, server-side enforcement of the admin role on top
// of requireAuth. Admin actions are recorded to the activity log.
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Listing = require('../models/listing.model');
const Booking = require('../models/booking.model');
const Review = require('../models/review.model');
const ActivityLog = require('../models/activityLog.model');
const SecurityAlert = require('../models/securityAlert.model');
const { destroyUserSessions } = require('../config/session');
const { logActivity } = require('../services/activityLog.service');
const {
  hideListingsForInactiveOwner,
  restoreListingsForActiveOwner,
} = require('../services/listingVisibility.service');
const { computeIntegrityHash } = require('../utils/bookingIntegrity');

function paging(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  return { page, limit, skip: (page - 1) * limit };
}

async function overview(req, res, next) {
  try {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [users, listings, bookingsThisMonth, openDisputes, unackAlerts] = await Promise.all([
      User.countDocuments(),
      Listing.countDocuments({ status: 'active' }),
      Booking.countDocuments({ createdAt: { $gte: monthAgo } }),
      Booking.countDocuments({ status: 'disputed' }),
      SecurityAlert.countDocuments({ acknowledged: false }),
    ]);
    return res.json({ users, listings, bookingsThisMonth, openDisputes, unackAlerts });
  } catch (err) {
    return next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const { skip, limit, page } = paging(req);
    const users = await User.find()
      .select('name email role status createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    return res.json({ items: users, page });
  } catch (err) {
    return next(err);
  }
}

async function suspendUser(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });

    user.status = req.body.suspend ? 'suspended' : 'active';
    await user.save();
    // Keep their listings in step: a suspended lender's items must not stay
    // bookable, and reinstating restores the ones we hid.
    let listingsAffected;
    if (req.body.suspend) {
      await destroyUserSessions(user._id); // revoke immediately
      listingsAffected = await hideListingsForInactiveOwner(user._id);
    } else {
      listingsAffected = await restoreListingsForActiveOwner(user._id);
    }

    await logActivity({
      userId: req.userId,
      action: req.body.suspend ? 'admin.user_suspend' : 'admin.user_reinstate',
      targetType: 'user',
      targetId: user._id,
      req,
      metadata: { listingsAffected },
    });
    return res.json({ id: user._id, status: user.status, listingsAffected });
  } catch (err) {
    return next(err);
  }
}

async function listLogs(req, res, next) {
  try {
    const { skip, limit, page } = paging(req);
    const filter = {};
    if (req.query.userId && mongoose.isValidObjectId(req.query.userId)) filter.userId = req.query.userId;
    if (req.query.action) filter.action = String(req.query.action);
    const logs = await ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.json({ items: logs, page });
  } catch (err) {
    return next(err);
  }
}

async function listAlerts(req, res, next) {
  try {
    const filter = {};
    if (req.query.unacknowledged === 'true') filter.acknowledged = false;
    const alerts = await SecurityAlert.find(filter).sort({ createdAt: -1 }).limit(100);
    return res.json(alerts);
  } catch (err) {
    return next(err);
  }
}

async function acknowledgeAlert(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const alert = await SecurityAlert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Not found' });
    return res.json(alert);
  } catch (err) {
    return next(err);
  }
}

async function removeListing(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { status: 'removed_by_admin' },
      { new: true }
    );
    if (!listing) return res.status(404).json({ error: 'Not found' });
    await logActivity({ userId: req.userId, action: 'admin.listing_remove', targetType: 'listing', targetId: listing._id, req });
    return res.json({ id: listing._id, status: listing.status });
  } catch (err) {
    return next(err);
  }
}

async function listReviews(req, res, next) {
  try {
    const { skip, limit, page } = paging(req);
    const reviews = await Review.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.json({ items: reviews, page });
  } catch (err) {
    return next(err);
  }
}

async function removeReview(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ error: 'Not found' });
    await logActivity({ userId: req.userId, action: 'admin.review_remove', targetType: 'review', targetId: review._id, req });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function listBookings(req, res, next) {
  try {
    const { skip, limit, page } = paging(req);
    const filter = {};
    if (req.query.status) filter.status = String(req.query.status);
    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.json({ items: bookings, page });
  } catch (err) {
    return next(err);
  }
}

async function resolveDispute(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    // Only a disputed booking can be resolved (one further terminal state).
    if (booking.status !== 'disputed') {
      return res.status(409).json({ error: 'Only a disputed booking can be resolved' });
    }

    const now = new Date();
    booking.status = 'resolved';
    booking.statusHistory.push({ status: 'resolved', at: now, byUserId: req.userId });
    booking.integrityHash = computeIntegrityHash(booking);
    await booking.save();

    await logActivity({
      userId: req.userId,
      action: 'admin.dispute_resolve',
      targetType: 'booking',
      targetId: booking._id,
      req,
      metadata: { outcome: req.body.outcome },
    });
    return res.json({ id: booking._id, status: booking.status, outcome: req.body.outcome });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  overview,
  listUsers,
  suspendUser,
  listLogs,
  listAlerts,
  acknowledgeAlert,
  removeListing,
  listReviews,
  removeReview,
  listBookings,
  resolveDispute,
};
