// Admin routes. Every route is double-guarded: requireAuth (a valid session)
// then requireRole('admin') (the admin role, read from the session only).
const express = require('express');
const { validate } = require('../middleware/validate');
const { requireAuth, requireAdminMfa } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { suspendSchema, resolveSchema } = require('../utils/adminValidation');
const admin = require('../controllers/admin.controller');

const router = express.Router();

// Apply auth + admin role + mandatory admin MFA to everything in this router.
router.use(requireAuth, requireRole('admin'), requireAdminMfa);

router.get('/overview', admin.overview);
router.get('/users', admin.listUsers);
router.patch('/users/:id/suspend', validate(suspendSchema), admin.suspendUser);
router.get('/logs', admin.listLogs);
router.get('/alerts', admin.listAlerts);
router.patch('/alerts/:id/acknowledge', admin.acknowledgeAlert);
router.patch('/listings/:id/remove', admin.removeListing);
router.get('/reviews', admin.listReviews);
router.delete('/reviews/:id', admin.removeReview);
router.get('/bookings', admin.listBookings);
router.patch('/bookings/:id/resolve', validate(resolveSchema), admin.resolveDispute);

module.exports = router;
