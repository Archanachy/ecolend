// Listing model. `ownerId` is the lender for this listing and is always set
// from the authenticated session server-side, never from the request body.
const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, required: true, trim: true },
    photos: { type: [String], default: [] },
    depositAmount: { type: Number, required: true, min: 0 }, // NPR
    feePerDay: { type: Number, required: true, min: 0 }, // NPR
    location: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'paused', 'removed_by_admin'],
      default: 'active',
    },
    // True when the system paused this listing because its owner became
    // inactive (suspended or pending deletion) — as opposed to the owner
    // pausing it themselves. Lets a reinstatement restore exactly the
    // listings we hid, without un-pausing ones the owner chose to pause.
    pausedByOwnerInactive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Listing', listingSchema);
