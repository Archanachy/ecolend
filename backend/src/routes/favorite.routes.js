// Saved-listing routes. All require a session; every handler scopes its query
// to req.userId.
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const favorites = require('../controllers/favorite.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', favorites.listFavorites);
router.get('/ids', favorites.listFavoriteIds);
router.post('/:listingId', favorites.addFavorite);
router.delete('/:listingId', favorites.removeFavorite);

module.exports = router;
