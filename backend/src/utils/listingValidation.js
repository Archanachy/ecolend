// Zod schemas for listing create/update. Strict — ownerId and admin-only status
// values can never be set by a client. Amounts are non-negative NPR.
const { z } = require('zod');

const createListingSchema = z
  .object({
    title: z.string().trim().min(1).max(140),
    description: z.string().max(4000).optional().default(''),
    category: z.string().trim().min(1).max(60),
    photos: z.array(z.string().url().max(2048)).max(10).optional().default([]),
    depositAmount: z.number().min(0).max(10_000_000),
    feePerDay: z.number().min(0).max(10_000_000),
    location: z.string().max(200).optional().default(''),
  })
  .strict();

// Update is a partial of the same fields, plus an owner-controllable status that
// is limited to active/paused (removed_by_admin is admin-only, elsewhere).
const updateListingSchema = z
  .object({
    title: z.string().trim().min(1).max(140).optional(),
    description: z.string().max(4000).optional(),
    category: z.string().trim().min(1).max(60).optional(),
    photos: z.array(z.string().url().max(2048)).max(10).optional(),
    depositAmount: z.number().min(0).max(10_000_000).optional(),
    feePerDay: z.number().min(0).max(10_000_000).optional(),
    location: z.string().max(200).optional(),
    status: z.enum(['active', 'paused']).optional(),
  })
  .strict();

module.exports = { createListingSchema, updateListingSchema };
