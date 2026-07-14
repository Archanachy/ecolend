// Password hashing with argon2id. Parameters meet the project minimums
// (memory >= 19 MiB, iterations >= 2, parallelism >= 1) and are recorded here
// so the final values can be cited in the report. Never store or log the
// plaintext password.
const argon2 = require('argon2');

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // KiB (= 19 MiB)
  timeCost: 3, // iterations
  parallelism: 1,
};

async function hashPassword(plain) {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

async function verifyPassword(hash, plain) {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

// True if the plaintext matches any of the stored recent hashes — used to block
// reuse of a recent password on change/reset.
async function isPasswordReused(plain, historyHashes = []) {
  for (const h of historyHashes) {
    if (await verifyPassword(h, plain)) return true;
  }
  return false;
}

// Prepend the new hash and keep only the most recent five.
function pushHistory(historyHashes = [], newHash) {
  return [newHash, ...historyHashes].slice(0, 5);
}

module.exports = {
  hashPassword,
  verifyPassword,
  isPasswordReused,
  pushHistory,
  ARGON2_OPTIONS,
};
