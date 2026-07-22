// Review routes. Listing reviews is public; creating one requires auth and
// (enforced in the controller) participation in a completed booking.
const express = require('express');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { createReviewSchema } = require('../utils/reviewValidation');
const reviewController = require('../controllers/review.controller');

const router = express.Router();

router.get('/', reviewController.listReviews);
router.post('/', requireAuth, validate(createReviewSchema), reviewController.createReview);

module.exports = router;
