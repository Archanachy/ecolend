// Zod schemas for auth routes. `.strict()` rejects any field not listed here,
// so a client can never smuggle extra fields (e.g. role) into a write — this
// is the mass-assignment defence. Password strength rules are layered on top
// in passwordPolicy.js and applied in the controller.
const { z } = require('zod');
const { passwordField } = require('./passwordPolicy');

const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email().max(254),
    password: passwordField,
  })
  .strict();

// Login does not re-check password strength — it only needs the credentials.
const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict();

const verifyEmailSchema = z.object({ token: z.string().min(1).max(2048) }).strict();

const resendVerificationSchema = z
  .object({ email: z.string().trim().toLowerCase().email().max(254) })
  .strict();

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
};
