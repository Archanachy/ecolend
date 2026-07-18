// Zod schema for profile updates. `.strict()` rejects anything not listed here,
// so fields like role, status, email or passwordHash can never be set through
// this route (mass-assignment / privilege-escalation defence).
const { z } = require('zod');

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    bio: z.string().max(1000).optional(),
    avatarUrl: z.string().max(2048).url().optional().or(z.literal('')),
    location: z.string().max(200).optional(),
    phone: z.string().max(30).optional().or(z.literal('')),
    address: z.string().max(300).optional().or(z.literal('')),
    notificationPrefs: z
      .object({ email: z.boolean().optional(), inApp: z.boolean().optional() })
      .strict()
      .optional(),
  })
  .strict();

module.exports = { updateProfileSchema };
