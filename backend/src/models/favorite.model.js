// Saved listings ("favorites"). One row per (user, listing) pair — the unique
// compound index makes saving idempotent and prevents duplicates.
const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

favoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
