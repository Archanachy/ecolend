// Auth routes. All bodies pass through a strict zod schema before the
// controller runs.
const express = require('express');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../utils/authValidation');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post(
  '/verify-email/resend',
  validate(resendVerificationSchema),
  authController.resendVerification
);
router.post(
  '/password/forgot',
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/password/reset',
  validate(resetPasswordSchema),
  authController.resetPassword
);

module.exports = router;
