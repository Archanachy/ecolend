// Booking model — the stateful core of the app. The status field follows a
// fixed, linear state machine enforced server-side (see the booking
// controller). Payment fields are written only after the Khalti Lookup API
// independently verifies the payment; the return_url callback is never trusted.
const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    borrowerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    }, // denormalised from listing.ownerId at creation
    status: {
      type: String,
      enum: [
        'requested',
        'approved',
        'paid',
        'active',
        'returned',
        'completed',
        'disputed',
        'resolved',
        'cancelled',
      ],
      default: 'requested',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    feeTotal: { type: Number, required: true, min: 0 }, // NPR
    depositAmount: { type: Number, required: true, min: 0 }, // NPR

    // Khalti payment integrity fields.
    khaltiPidx: { type: String }, // unique+sparse index declared below
    khaltiPaymentUrl: { type: String },
    khaltiAmountPaisa: { type: Number }, // exact integer paisa sent at initiate
    khaltiTransactionId: { type: String }, // stored only after Lookup confirms
    paymentVerifiedAt: { type: Date }, // timestamp of the server-side Lookup check

    integrityHash: { type: String }, // SHA-256 of canonical fields, checked on read
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true }
);

// Unique across bookings so a pidx can never be reused; sparse so the many
// bookings without a pidx yet (null) do not collide.
bookingSchema.index({ khaltiPidx: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Booking', bookingSchema);
