// Review model. A booking has two sides, so BOTH participants may review each
// other — but each of them only once. That is a unique index on the PAIR
// (bookingId, authorId), not on bookingId alone: a bookingId-only unique index
// lets whoever reviews first lock the other party out permanently.
// Only a participant of a completed booking may author one.
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One review per person per booking — the pair is what must be unique.
reviewSchema.index({ bookingId: 1, authorId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
