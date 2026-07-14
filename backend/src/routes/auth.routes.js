// Auth routes. All bodies pass through a strict zod schema before the
// controller runs.
const express = require('express');
const { validate } = require('../middleware/validate');
const { registerSchema } = require('../utils/authValidation');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);

module.exports = router;
