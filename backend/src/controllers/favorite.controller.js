// Saved listings. Every query is scoped to req.userId (from the session), so a
// user can only ever read or change their own favorites — no IDOR surface.
const mongoose = require('mongoose');
const Favorite = require('../models/favorite.model');
const Listing = require('../models/listing.model');

// GET /api/favorites — the user's saved listings, newest first.
async function listFavorites(req, res, next) {
  try {
    const favorites = await Favorite.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .populate('listingId');
    // Drop entries whose listing was deleted or removed by an admin.
    const items = favorites
      .filter((f) => f.listingId && f.listingId.status !== 'removed_by_admin')
      .map((f) => f.listingId);
    return res.json(items);
  } catch (err) {
    return next(err);
  }
}

// GET /api/favorites/ids — lightweight id list, for marking hearts in a grid.
async function listFavoriteIds(req, res, next) {
  try {
    const favorites = await Favorite.find({ userId: req.userId }).select('listingId');
    return res.json(favorites.map((f) => String(f.listingId)));
  } catch (err) {
    return next(err);
  }
}

// POST /api/favorites/:listingId — idempotent save.
async function addFavorite(req, res, next) {
  try {
    const { listingId } = req.params;
    if (!mongoose.isValidObjectId(listingId)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const listing = await Listing.findById(listingId);
    if (!listing || listing.status === 'removed_by_admin') {
      return res.status(404).json({ error: 'Not found' });
    }
    // upsert => saving twice is a no-op rather than a duplicate-key error.
    await Favorite.updateOne(
      { userId: req.userId, listingId },
      { $setOnInsert: { userId: req.userId, listingId } },
      { upsert: true }
    );
    return res.status(201).json({ saved: true });
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/favorites/:listingId — idempotent unsave.
async function removeFavorite(req, res, next) {
  try {
    const { listingId } = req.params;
    if (!mongoose.isValidObjectId(listingId)) {
      return res.status(404).json({ error: 'Not found' });
    }
    await Favorite.deleteOne({ userId: req.userId, listingId });
    return res.json({ saved: false });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listFavorites, listFavoriteIds, addFavorite, removeFavorite };
