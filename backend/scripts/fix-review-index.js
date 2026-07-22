// One-off migration: replace the old single-field unique index on
// reviews.bookingId with the compound (bookingId, authorId) one.
//
// Why this is needed: the original model marked bookingId `unique: true`, which
// allowed only ONE review per booking — so whichever party reviewed first
// locked the other out. The model now declares a compound unique index, but
// Mongoose never DROPS an index that was removed from a schema, so an existing
// database keeps enforcing the old rule until this runs.
//
//   node scripts/fix-review-index.js
//
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../src/config/env');

const OLD_INDEX = 'bookingId_1';
const NEW_INDEX = 'bookingId_1_authorId_1';

async function main() {
  await mongoose.connect(env.mongoUri);
  const reviews = mongoose.connection.db.collection('reviews');

  const existing = await reviews.indexes();
  const names = existing.map((i) => i.name);

  // Refuse to proceed if the data itself would violate the new index — better
  // to report it than to have createIndex fail halfway.
  const dupes = await reviews
    .aggregate([
      { $group: { _id: { bookingId: '$bookingId', authorId: '$authorId' }, n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
    ])
    .toArray();
  if (dupes.length) {
    console.error(`Found ${dupes.length} duplicate (bookingId, authorId) pairs. Resolve these first:`);
    dupes.forEach((d) => console.error(`  booking ${d._id.bookingId} author ${d._id.authorId} x${d.n}`));
    process.exitCode = 1;
    return;
  }

  if (names.includes(OLD_INDEX)) {
    await reviews.dropIndex(OLD_INDEX);
    console.log(`Dropped stale index ${OLD_INDEX} (one-review-per-booking).`);
  } else {
    console.log(`No ${OLD_INDEX} index present — nothing to drop.`);
  }

  if (names.includes(NEW_INDEX)) {
    console.log(`Index ${NEW_INDEX} already exists.`);
  } else {
    await reviews.createIndex({ bookingId: 1, authorId: 1 }, { unique: true });
    console.log(`Created ${NEW_INDEX} — both parties can now review, once each.`);
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
