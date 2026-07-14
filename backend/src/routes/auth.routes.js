// Auth routes. All bodies pass through a strict zod schema before the
// controller runs.
const express = require('express');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../utils/authValidation');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;
