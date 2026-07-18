// User routes. '/me' operates only on the caller's own record; '/:id' is a
// public profile view. '/me' is declared before '/:id' so it isn't captured by
// the param route.
const express = require('express');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { updateProfileSchema } = require('../utils/userValidation');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.get('/me', requireAuth, userController.getMe);
router.patch('/me', requireAuth, validate(updateProfileSchema), userController.updateMe);
router.get('/me/export', requireAuth, userController.exportMyData);
router.post('/me/delete-request', requireAuth, userController.requestDeletion);
router.get('/:id', userController.getPublicProfile);

module.exports = router;
