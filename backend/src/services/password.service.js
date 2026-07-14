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

module.exports = { hashPassword, verifyPassword, ARGON2_OPTIONS };
