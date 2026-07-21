// Transaction-integrity hashing for bookings. A SHA-256 over the canonical
// booking fields is stored on every write and recomputed on every read; a
// mismatch means the record was altered outside the normal application path
// (e.g. directly in the database), which is treated as a tamper event. This is
// integrity-checking via hashing, not a full asymmetric digital signature — the
// trade-off is documented in the report.
const crypto = require('crypto');

function computeIntegrityHash(booking) {
  const canonical = [
    String(booking._id),
    booking.status,
    Number(booking.feeTotal),
    Number(booking.depositAmount),
    booking.createdAt ? new Date(booking.createdAt).getTime() : '',
  ].join('|');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function verifyIntegrity(booking) {
  if (!booking.integrityHash) return true; // legacy/None — nothing to check yet
  return booking.integrityHash === computeIntegrityHash(booking);
}

module.exports = { computeIntegrityHash, verifyIntegrity };
