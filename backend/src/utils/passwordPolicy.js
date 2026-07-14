// Password policy, enforced server-side (the client meter is convenience only).
// 12-128 chars, at least one upper/lower/digit/special, and a zxcvbn strength
// score of at least 2 out of 4. Reused by registration and password reset.
const { z } = require('zod');
const zxcvbn = require('zxcvbn');

const MIN_LENGTH = 12;
const MAX_LENGTH = 128;
const MIN_ZXCVBN_SCORE = 2;

const passwordField = z
  .string()
  .min(MIN_LENGTH, `Password must be at least ${MIN_LENGTH} characters`)
  .max(MAX_LENGTH, `Password must be at most ${MAX_LENGTH} characters`)
  .refine((v) => /[a-z]/.test(v), 'Password needs a lowercase letter')
  .refine((v) => /[A-Z]/.test(v), 'Password needs an uppercase letter')
  .refine((v) => /[0-9]/.test(v), 'Password needs a digit')
  .refine((v) => /[^A-Za-z0-9]/.test(v), 'Password needs a special character')
  .refine((v) => zxcvbn(v).score >= MIN_ZXCVBN_SCORE, 'Password is too weak');

module.exports = { passwordField, MIN_LENGTH, MAX_LENGTH, MIN_ZXCVBN_SCORE };
