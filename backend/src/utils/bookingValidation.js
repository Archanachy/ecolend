// Zod schemas for booking routes. Strict — the client supplies only the listing
// and dates; borrowerId, lenderId, amounts, status and payment fields are all
// derived server-side.
const { z } = require('zod');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const createBookingSchema = z
  .object({
    listingId: objectId,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .strict()
  .refine((d) => d.endDate > d.startDate, {
    path: ['endDate'],
    message: 'End date must be after start date',
  });

const statusChangeSchema = z
  .object({
    action: z.enum(['approve', 'reject', 'cancel', 'handover', 'return', 'complete', 'dispute']),
  })
  .strict();

const commentSchema = z.object({ body: z.string().trim().min(1).max(2000) }).strict();

module.exports = { createBookingSchema, statusChangeSchema, commentSchema };
