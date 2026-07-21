// Booking routes. All require authentication; per-booking authorization (IDOR
// guard, state-machine role gating) is enforced in the controller. '/mine' and
// '/requests' are declared before '/:id' so they aren't captured by the param.
const express = require('express');
const { validate } = require('../middleware/validate');
const { requireAuth, requireVerifiedEmail } = require('../middleware/auth');
const {
  createBookingSchema,
  statusChangeSchema,
  commentSchema,
} = require('../utils/bookingValidation');
const bookingController = require('../controllers/booking.controller');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

router.post('/', requireAuth, requireVerifiedEmail, validate(createBookingSchema), bookingController.createBooking);
router.get('/mine', requireAuth, bookingController.myBookings);
router.get('/requests', requireAuth, bookingController.bookingRequests);
// Static path declared before /:id so it isn't captured as an id.
router.get('/earnings', requireAuth, bookingController.earnings);
router.get('/:id', requireAuth, bookingController.getBooking);
router.patch('/:id/status', requireAuth, validate(statusChangeSchema), bookingController.changeStatus);
router.post('/:id/comments', requireAuth, validate(commentSchema), bookingController.addComment);

// Payments (Khalti). Initiation is borrower-only (same-site POST). The callback
// is the Khalti return_url: it is NOT session-authenticated because Khalti
// redirects cross-site (SameSite=Strict cookie isn't sent) — its authority is
// the server-side Lookup verification, and it is idempotent + fail-closed.
router.post('/:id/pay', requireAuth, paymentController.initiatePayment);
router.get('/:id/payment/callback', paymentController.paymentCallback);

module.exports = router;
