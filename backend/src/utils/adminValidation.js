// Zod schemas for admin actions.
const { z } = require('zod');

const suspendSchema = z.object({ suspend: z.boolean() }).strict();

const resolveSchema = z
  .object({
    outcome: z.enum(['release_to_lender', 'return_to_borrower']),
    note: z.string().max(1000).optional().default(''),
  })
  .strict();

module.exports = { suspendSchema, resolveSchema };
