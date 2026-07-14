// Zod schemas for auth routes. `.strict()` rejects any field not listed here,
// so a client can never smuggle extra fields (e.g. role) into a write — this
// is the mass-assignment defence. Password strength rules are layered on top
// in passwordPolicy.js and applied in the controller.
const { z } = require('zod');

const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict();

module.exports = { registerSchema };
