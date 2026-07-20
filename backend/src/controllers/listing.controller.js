// Listing controller. Ownership is always derived from the session: a new
// listing's ownerId is set from req.userId (never the body), and edit/delete
// require the caller to own the listing (or be an admin). This is the IDOR /
// privilege-escalation defence for listings.
const mongoose = require('mongoose');
const Listing = require('../models/listing.model');
const Booking = require('../models/booking.model');
const { isOwnerOrAdmin } = require('../middleware/rbac');

async function createListing(req, res, next) {
  try {
    const b = req.body; // validated + whitelisted
    const listing = await Listing.create({
      ownerId: req.userId, // from the session, never the request body
      title: b.title,
      description: b.description,
      category: b.category,
      photos: b.photos,
      depositAmount: b.depositAmount,
      feePerDay: b.feePerDay,
      location: b.location,
    });
    return res.status(201).json(listing);
  } catch (err) {
    return next(err);
  }
}

// Public browse with basic filtering, sorting, and pagination. Only active
// listings are returned.
async function listListings(req, res, next) {
  try {
    const { category, location, q, minPrice, maxPrice, sort } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));

    const filter = { status: 'active' };
    if (category) filter.category = String(category);
    if (location) filter.location = new RegExp(escapeRegex(String(location)), 'i');
    if (q) filter.title = new RegExp(escapeRegex(String(q)), 'i');
    if (minPrice || maxPrice) {
      filter.feePerDay = {};
      if (minPrice) filter.feePerDay.$gte = Number(minPrice);
      if (maxPrice) filter.feePerDay.$lte = Number(maxPrice);
    }

    const sortMap = {
      newest: { createdAt: -1 },
      price_asc: { feePerDay: 1 },
      price_desc: { feePerDay: -1 },
    };
    const sortBy = sortMap[sort] || sortMap.newest;

    const [items, total] = await Promise.all([
      Listing.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit),
      Listing.countDocuments(filter),
    ]);
    return res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return next(err);
  }
}

async function getListing(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const listing = await Listing.findById(req.params.id);
    if (!listing || listing.status === 'removed_by_admin') {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(listing);
  } catch (err) {
    return next(err);
  }
}

// GET /api/listings/:id/availability — date ranges already taken, so the UI can
// grey them out. Returns only dates and nothing about who booked them, so it is
// safe to expose publicly.
async function getAvailability(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const bookings = await Booking.find({
      listingId: req.params.id,
      status: { $in: ['requested', 'approved', 'paid', 'active'] },
      endDate: { $gte: new Date() },
    }).select('startDate endDate');

    return res.json(
      bookings.map((b) => ({ startDate: b.startDate, endDate: b.endDate }))
    );
  } catch (err) {
    return next(err);
  }
}

async function getMyListings(req, res, next) {
  try {
    const listings = await Listing.find({ ownerId: req.userId }).sort({ createdAt: -1 });
    return res.json(listings);
  } catch (err) {
    return next(err);
  }
}

async function updateListing(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Not found' });
    if (!isOwnerOrAdmin(req, listing.ownerId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Apply only whitelisted fields.
    for (const key of Object.keys(req.body)) {
      listing[key] = req.body[key];
    }
    await listing.save();
    return res.json(listing);
  } catch (err) {
    return next(err);
  }
}

// Booking statuses that mean the listing is still committed to someone. A
// listing cannot be deleted while any of these exist: deleting would orphan
// the counterparty's booking, and would let a lender erase the item record
// mid-dispute. Terminal statuses (completed / resolved / cancelled) don't
// block, since the booking keeps its own denormalised fee and deposit.
const LIVE_BOOKING_STATUSES = ['requested', 'approved', 'paid', 'active', 'returned', 'disputed'];

async function deleteListing(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Not found' });
    if (!isOwnerOrAdmin(req, listing.ownerId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const live = await Booking.countDocuments({
      listingId: listing._id,
      status: { $in: LIVE_BOOKING_STATUSES },
    });
    if (live > 0) {
      return res.status(409).json({
        error:
          `This listing has ${live} booking${live === 1 ? '' : 's'} in progress and cannot be deleted. ` +
          'Pause it instead to hide it from Browse — you can delete it once those bookings finish.',
      });
    }

    await listing.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  createListing,
  listListings,
  getListing,
  getMyListings,
  getAvailability,
  updateListing,
  deleteListing,
};
