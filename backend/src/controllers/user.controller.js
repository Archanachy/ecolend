// User profile controller. Own-profile reads/writes go through /me and only
// ever touch the caller's own record (id from the session). Phone and address
// are AES-256-GCM encrypted at rest and decrypted only for the owner. The
// public profile exposes non-sensitive fields only.
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Listing = require('../models/listing.model');
const Booking = require('../models/booking.model');
const Review = require('../models/review.model');
const { encrypt, decrypt } = require('../services/crypto.service');
const { hideListingsForInactiveOwner } = require('../services/listingVisibility.service');
const { destroyUserSessions } = require('../config/session');

// The owner's own view — includes decrypted phone/address, never the hash/secret.
function selfView(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    profile: {
      bio: user.profile.bio,
      avatarUrl: user.profile.avatarUrl,
      location: user.profile.location,
      phone: user.profile.phoneEncrypted ? decrypt(user.profile.phoneEncrypted) : '',
      address: user.profile.addressEncrypted ? decrypt(user.profile.addressEncrypted) : '',
    },
    notificationPrefs: user.notificationPrefs,
  };
}

// Anyone's public view — no email, phone, or address.
function publicView(user) {
  return {
    id: user._id,
    name: user.name,
    profile: {
      bio: user.profile.bio,
      avatarUrl: user.profile.avatarUrl,
      location: user.profile.location,
    },
    createdAt: user.createdAt,
  };
}

async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Not found' });
    return res.json(selfView(user));
  } catch (err) {
    return next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const b = req.body; // validated + whitelisted by zod

    if (b.name !== undefined) user.name = b.name;
    if (b.bio !== undefined) user.profile.bio = b.bio;
    if (b.avatarUrl !== undefined) user.profile.avatarUrl = b.avatarUrl;
    if (b.location !== undefined) user.profile.location = b.location;
    if (b.phone !== undefined) {
      user.profile.phoneEncrypted = b.phone ? encrypt(b.phone) : undefined;
    }
    if (b.address !== undefined) {
      user.profile.addressEncrypted = b.address ? encrypt(b.address) : undefined;
    }
    if (b.notificationPrefs) {
      if (b.notificationPrefs.email !== undefined) {
        user.notificationPrefs.email = b.notificationPrefs.email;
      }
      if (b.notificationPrefs.inApp !== undefined) {
        user.notificationPrefs.inApp = b.notificationPrefs.inApp;
      }
    }

    await user.save();
    return res.json(selfView(user));
  } catch (err) {
    return next(err);
  }
}

async function getPublicProfile(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const user = await User.findById(req.params.id);
    if (!user || user.status === 'deleted_pending') {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(publicView(user));
  } catch (err) {
    return next(err);
  }
}

// GDPR-style export of the caller's own data only (IDOR-safe — everything is
// scoped to req.userId from the session).
async function exportMyData(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const [listings, bookings, reviews] = await Promise.all([
      Listing.find({ ownerId: req.userId }),
      Booking.find({ $or: [{ borrowerId: req.userId }, { lenderId: req.userId }] }),
      Review.find({ $or: [{ authorId: req.userId }, { targetUserId: req.userId }] }),
    ]);
    res.setHeader('Content-Disposition', 'attachment; filename="ecolend-data.json"');
    return res.json({ user: selfView(user), listings, bookings, reviews });
  } catch (err) {
    return next(err);
  }
}

// Soft-delete request: marks the account and revokes all sessions immediately.
// Booking statuses that still bind the user to a counterparty — money or an
// item is outstanding, so the account cannot be walked away from yet.
const LIVE_BOOKING_STATUSES = ['requested', 'approved', 'paid', 'active', 'returned', 'disputed'];

async function requestDeletion(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Not found' });

    // Refuse while the user is mid-transaction on either side: deleting here
    // would strand the counterparty and any deposit still held.
    const live = await Booking.countDocuments({
      $or: [{ borrowerId: user._id }, { lenderId: user._id }],
      status: { $in: LIVE_BOOKING_STATUSES },
    });
    if (live > 0) {
      return res.status(409).json({
        error:
          `You have ${live} booking${live === 1 ? '' : 's'} in progress. ` +
          'Please finish or cancel them before deleting your account.',
      });
    }

    user.status = 'deleted_pending';
    await user.save();
    // Their listings must stop being bookable straight away.
    await hideListingsForInactiveOwner(user._id);
    await destroyUserSessions(user._id);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMe, updateMe, getPublicProfile, exportMyData, requestDeletion };
