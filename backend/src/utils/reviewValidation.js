// Zod schema for creating a review. Strict — authorId/targetUserId are derived
// server-side from the booking, never supplied by the client.
const { z } = require('zod');

const createReviewSchema = z
  .object({
    bookingId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id'),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).optional().default(''),
  })
  .strict();

module.exports = { createReviewSchema };
