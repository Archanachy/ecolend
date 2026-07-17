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

const forgotPasswordSchema = z
  .object({ email: z.string().trim().toLowerCase().email().max(254) })
  .strict();

const resetPasswordSchema = z
  .object({ token: z.string().min(1).max(2048), password: passwordField })
  .strict();

const resendVerificationSchema = z
  .object({ email: z.string().trim().toLowerCase().email().max(254) })
  .strict();

// A 6-digit TOTP code (used to enable, disable, and confirm MFA setup).
const mfaCodeSchema = z
  .object({ code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code') })
  .strict();

// Login completion accepts either a TOTP code or one backup code.
const mfaVerifySchema = z
  .object({
    code: z.string().trim().regex(/^\d{6}$/).optional(),
    backupCode: z.string().trim().min(4).max(32).optional(),
  })
  .strict()
  .refine((d) => d.code || d.backupCode, {
    message: 'Provide a code or a backup code',
  });

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  mfaCodeSchema,
  mfaVerifySchema,
};
