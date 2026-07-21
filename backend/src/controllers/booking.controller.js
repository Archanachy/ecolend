// Booking controller. Enforces the state machine, the participant-only IDOR
// guard, and transaction-integrity hashing. All identities and amounts are
// derived server-side; the client only ever picks a listing, dates, and a
// legal action.
const mongoose = require('mongoose');
const Booking = require('../models/booking.model');
const Listing = require('../models/listing.model');
const SecurityAlert = require('../models/securityAlert.model');
const { evaluate } = require('../utils/bookingStateMachine');
const { computeIntegrityHash, verifyIntegrity } = require('../utils/bookingIntegrity');
const { notifyUser, bookingUrl } = require('../services/notification.service');

// Message sent to the counterparty when a booking reaches each status.
const STATUS_MESSAGE = {
  approved: 'Your booking request was approved — you can now pay.',
  rejected: 'Your booking request was declined.',
  active: 'Your booking is active — the item has been handed over.',
  returned: 'The borrower has marked the item as returned.',
  completed: 'Your booking is complete. Thanks for using EcoLend!',
  cancelled: 'A booking was cancelled.',
  disputed: 'A dispute has been opened on a booking.',
};
const { logActivity } = require('../services/activityLog.service');
const { logger } = require('../middleware/logger');

const DAY_MS = 24 * 60 * 60 * 1000;

function isParticipant(booking, req) {
  return (
    req.role === 'admin' ||
    String(booking.borrowerId) === String(req.userId) ||
    String(booking.lenderId) === String(req.userId)
  );
}

async function createBooking(req, res, next) {
  try {
    const { listingId, startDate, endDate } = req.body;
    const listing = await Listing.findById(listingId);
    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ error: 'Listing not available' });
    }
    // A user cannot borrow their own listing (blocks the self-approval abuse).
    if (String(listing.ownerId) === String(req.userId)) {
      return res.status(400).json({ error: 'You cannot book your own listing' });
    }

    // Block dates that overlap an existing, non-cancelled booking on this listing.
    const clash = await Booking.findOne({
      listingId,
      status: { $in: ['requested', 'approved', 'paid', 'active'] },
      startDate: { $lt: endDate },
      endDate: { $gt: startDate },
    });
    if (clash) return res.status(409).json({ error: 'Those dates are not available' });

    const days = Math.max(1, Math.ceil((endDate - startDate) / DAY_MS));
    const feeTotal = listing.feePerDay * days;

    const booking = new Booking({
      listingId,
      borrowerId: req.userId, // from the session
      lenderId: listing.ownerId, // denormalised from the listing
      status: 'requested',
      startDate,
      endDate,
      feeTotal,
      depositAmount: listing.depositAmount,
      statusHistory: [{ status: 'requested', at: new Date(), byUserId: req.userId }],
    });
    // Persist first so Mongoose populates the timestamped `createdAt`, THEN seal
    // the integrity hash — `createdAt` is one of the hashed fields, so hashing
    // before save would store a hash that never matches on read (409).
    await booking.save();
    booking.integrityHash = computeIntegrityHash(booking);
    await booking.save();
    // Notify the lender of the new request (best-effort, respects prefs).
    await notifyUser(
      booking.lenderId,
      'New booking request on EcoLend',
      `You have a new request to borrow your item.\n\n${bookingUrl(booking._id)}`,
      { link: `/bookings/${booking._id}`, type: 'booking' }
    );
    return res.status(201).json(booking);
  } catch (err) {
    return next(err);
  }
}

async function getBooking(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    // IDOR guard: only the borrower, lender, or an admin may view it.
    if (!isParticipant(booking, req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Integrity guard: a record altered outside the app is rejected + alerted.
    if (!verifyIntegrity(booking)) {
      await SecurityAlert.create({
        type: 'integrity_mismatch',
        userId: req.userId,
        detail: `Integrity check failed for booking ${booking._id}`,
      }).catch(() => {});
      logger.warn('security.integrity_mismatch', { bookingId: String(booking._id) });
      return res.status(409).json({ error: 'This booking record failed an integrity check' });
    }
    return res.json(booking);
  } catch (err) {
    return next(err);
  }
}

async function myBookings(req, res, next) {
  try {
    const bookings = await Booking.find({ borrowerId: req.userId }).sort({ createdAt: -1 });
    return res.json(bookings);
  } catch (err) {
    return next(err);
  }
}

async function bookingRequests(req, res, next) {
  try {
    const bookings = await Booking.find({ lenderId: req.userId }).sort({ createdAt: -1 });
    return res.json(bookings);
  } catch (err) {
    return next(err);
  }
}

// GET /api/bookings/earnings — lender earnings summary for the current user.
// Deposits are excluded: they are refundable and never income.
async function earnings(req, res, next) {
  try {
    const lenderId = new mongoose.Types.ObjectId(req.userId);
    // Every status in which the borrower has actually paid. 'requested' and
    // 'approved' are pre-payment; 'cancelled' never took money. 'disputed' is
    // included so paid-but-contested money stays visible (as pending, not
    // earned) rather than silently disappearing from the lender's totals.
    const EARNED = ['paid', 'active', 'returned', 'disputed', 'completed', 'resolved'];

    const bookings = await Booking.find({ lenderId, status: { $in: EARNED } })
      .sort({ createdAt: -1 })
      .limit(100);

    const completed = bookings.filter((b) => b.status === 'completed' || b.status === 'resolved');
    const pending = bookings.filter((b) => !['completed', 'resolved'].includes(b.status));
    const sum = (list) => list.reduce((t, b) => t + (b.feeTotal || 0), 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return res.json({
      totalEarned: sum(completed),
      pendingEarnings: sum(pending),
      thisMonth: sum(completed.filter((b) => new Date(b.createdAt) >= monthStart)),
      completedCount: completed.length,
      activeCount: pending.length,
      recent: bookings.slice(0, 10).map((b) => ({
        _id: b._id,
        status: b.status,
        feeTotal: b.feeTotal,
        depositAmount: b.depositAmount,
        startDate: b.startDate,
        endDate: b.endDate,
        createdAt: b.createdAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

async function changeStatus(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Not found' });

    const result = evaluate(req.body.action, booking, req.userId);
    if (!result.ok) return res.status(result.code).json({ error: result.error });

    booking.status = result.to;
    booking.statusHistory.push({ status: result.to, at: new Date(), byUserId: req.userId });
    booking.integrityHash = computeIntegrityHash(booking);
    await booking.save();
    logger.info('booking.status_change', {
      bookingId: String(booking._id),
      to: result.to,
      byUserId: req.userId,
    });
    await logActivity({
      userId: req.userId,
      action: 'booking.status_change',
      targetType: 'booking',
      targetId: booking._id,
      req,
      metadata: { to: result.to },
    });
    // Notify the other party (the one who did not perform this action).
    const message = STATUS_MESSAGE[result.to];
    if (message) {
      const recipientId =
        String(booking.borrowerId) === String(req.userId) ? booking.lenderId : booking.borrowerId;
      await notifyUser(recipientId, message, `${message}\n\n${bookingUrl(booking._id)}`, {
        link: `/bookings/${booking._id}`,
        type: 'booking',
      });
    }
    return res.json(booking);
  } catch (err) {
    return next(err);
  }
}

async function addComment(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (!isParticipant(booking, req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    booking.comments.push({ authorId: req.userId, body: req.body.body, at: new Date() });
    await booking.save();
    return res.status(201).json(booking.comments[booking.comments.length - 1]);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createBooking,
  getBooking,
  myBookings,
  bookingRequests,
  earnings,
  changeStatus,
  addComment,
};
