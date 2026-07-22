// Review controller. A review can only be written by a participant of a
// completed booking. Both participants may review each other, but each only
// once — enforced by the unique (bookingId, authorId) index. The comment is
// stored as-is; React escapes it on render and
// dangerouslySetInnerHTML is banned project-wide, which is the stored-XSS
// defence.
const mongoose = require('mongoose');
const Review = require('../models/review.model');
const Booking = require('../models/booking.model');

async function createReview(req, res, next) {
  try {
    const { bookingId, rating, comment } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'You can only review a completed booking' });
    }

    const isBorrower = String(booking.borrowerId) === String(req.userId);
    const isLender = String(booking.lenderId) === String(req.userId);
    if (!isBorrower && !isLender) return res.status(403).json({ error: 'Forbidden' });

    const targetUserId = isBorrower ? booking.lenderId : booking.borrowerId;

    try {
      const review = await Review.create({
        bookingId,
        authorId: req.userId,
        targetUserId,
        rating,
        comment,
      });
      return res.status(201).json(review);
    } catch (err) {
      if (err && err.code === 11000) {
        // The compound (bookingId, authorId) index — this author already
        // reviewed. The counterparty is still free to leave theirs.
        return res.status(409).json({ error: 'You have already reviewed this booking' });
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
}

// Public list of reviews about a given user (their received reviews).
async function listReviews(req, res, next) {
  try {
    const filter = {};
    if (req.query.userId && mongoose.isValidObjectId(req.query.userId)) {
      filter.targetUserId = req.query.userId;
    }
    // Reviews for one booking — lets the booking page show what each side
    // wrote, and whether the viewer has already had their say.
    if (req.query.bookingId && mongoose.isValidObjectId(req.query.bookingId)) {
      filter.bookingId = req.query.bookingId;
    }
    const reviews = await Review.find(filter).sort({ createdAt: -1 }).limit(50);
    return res.json(reviews);
  } catch (err) {
    return next(err);
  }
}

module.exports = { createReview, listReviews };
