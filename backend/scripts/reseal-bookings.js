// One-time maintenance: re-seal booking integrity hashes.
//
// The booking integrity hash is recomputed on every legitimate state change.
// Records transitioned by an earlier (buggy) code path can be left with a hash
// that no longer matches their data, so `GET /api/bookings/:id` fails its
// integrity check with 409 forever. This script finds those inconsistent
// bookings and recomputes the hash so they read cleanly again.
//
// It is a developer reconciliation tool, NOT part of the running app — the app
// never rewrites a mismatching hash (that is the whole point of the tamper
// check). Run it once, deliberately:
//
//   node scripts/reseal-bookings.js            # report only (dry run)
//   node scripts/reseal-bookings.js --apply    # actually re-seal
//
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../src/config/env');
const Booking = require('../src/models/booking.model');
const { computeIntegrityHash, verifyIntegrity } = require('../src/utils/bookingIntegrity');

const APPLY = process.argv.includes('--apply');

async function main() {
  await mongoose.connect(env.mongoUri);
  const all = await Booking.find({});
  const broken = all.filter((b) => b.integrityHash && !verifyIntegrity(b));

  console.log(`Scanned ${all.length} booking(s); ${broken.length} with a stale integrity hash.`);
  for (const b of broken) {
    console.log(`  - ${b._id}  status=${b.status}`);
    if (APPLY) {
      b.integrityHash = computeIntegrityHash(b);
      await b.save();
    }
  }

  if (broken.length === 0) {
    console.log('Nothing to do — all bookings are consistent.');
  } else if (APPLY) {
    console.log(`Re-sealed ${broken.length} booking(s).`);
  } else {
    console.log('Dry run — re-run with --apply to re-seal the above.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
