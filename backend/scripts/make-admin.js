// Promote (or demote) a user to admin by email. There is no default admin
// account — admin is granted deliberately by running this against the database.
//
//   node scripts/make-admin.js <email>            # promote to admin
//   node scripts/make-admin.js <email> --demote    # revert to a normal user
//
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../src/config/env');
const User = require('../src/models/user.model');

const email = process.argv[2];
const role = process.argv.includes('--demote') ? 'user' : 'admin';

if (!email) {
  console.error('Usage: node scripts/make-admin.js <email> [--demote]');
  process.exit(1);
}

async function main() {
  await mongoose.connect(env.mongoUri);
  const res = await User.updateOne({ email }, { $set: { role } });
  if (res.matchedCount === 0) {
    console.log(`No user found with email ${email}.`);
  } else {
    console.log(`${email} is now role="${role}".`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
