// Listing routes. Browse and detail are public; create/edit/delete require auth
// and (for edit/delete) ownership, enforced in the controller. '/mine' is
// declared before '/:id' so it isn't captured by the param route.
const express = require('express');
const { validate } = require('../middleware/validate');
const { requireAuth, requireVerifiedEmail } = require('../middleware/auth');
const { createListingSchema, updateListingSchema } = require('../utils/listingValidation');
const listingController = require('../controllers/listing.controller');

const router = express.Router();

router.get('/', listingController.listListings);
router.get('/mine', requireAuth, listingController.getMyListings);
router.post('/', requireAuth, requireVerifiedEmail, validate(createListingSchema), listingController.createListing);
router.get('/:id', listingController.getListing);
router.get('/:id/availability', listingController.getAvailability);
router.patch('/:id', requireAuth, validate(updateListingSchema), listingController.updateListing);
router.delete('/:id', requireAuth, listingController.deleteListing);

module.exports = router;
