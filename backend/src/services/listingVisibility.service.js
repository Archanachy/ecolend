// Keeps a lender's listings in step with their account status.
//
// Browse filters on the LISTING's status only — it never joins to the owner —
// so without this a suspended or self-deleted lender's items stay live and
// bookable by people who could never actually collect them. Hiding is done by
// flipping the listing to 'paused' and flagging why, so a reinstatement can
// restore exactly what we hid and nothing the owner paused themselves.
const Listing = require('../models/listing.model');

// Called when an account becomes inactive (suspended / pending deletion).
// Returns how many listings were hidden.
async function hideListingsForInactiveOwner(ownerId) {
  const res = await Listing.updateMany(
    { ownerId, status: 'active' },
    { $set: { status: 'paused', pausedByOwnerInactive: true } }
  );
  return res.modifiedCount || 0;
}

// Called when an account becomes active again. Only un-pauses the listings
// this service hid — a listing the owner paused on purpose stays paused.
async function restoreListingsForActiveOwner(ownerId) {
  const res = await Listing.updateMany(
    { ownerId, status: 'paused', pausedByOwnerInactive: true },
    { $set: { status: 'active', pausedByOwnerInactive: false } }
  );
  return res.modifiedCount || 0;
}

module.exports = { hideListingsForInactiveOwner, restoreListingsForActiveOwner };
