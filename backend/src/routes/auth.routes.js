// Auth routes. All bodies pass through a strict zod schema before the
// controller runs.
const express = require('express');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter, sensitiveLimiter, ipBlockGuard } = require('../middleware/rateLimiter');
const {
  stashCaptchaToken,
  requireCaptcha,
  requireCaptchaAfterFailures,
} = require('../middleware/captcha');
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  mfaCodeSchema,
  mfaVerifySchema,
} = require('../utils/authValidation');
const authController = require('../controllers/auth.controller');
const mfaController = require('../controllers/mfa.controller');
const sessionController = require('../controllers/session.controller');

const router = express.Router();

// Registration is rate-limited and always CAPTCHA-gated. Login adds the
// IP-block guard, its own limit, and a CAPTCHA that becomes mandatory once the
// account has 3+ consecutive failed attempts (spec 05). The token is stashed
// off the body before zod validation so the strict schemas still apply.
router.post(
  '/register',
  sensitiveLimiter,
  stashCaptchaToken,
  requireCaptcha,
  validate(registerSchema),
  authController.register
);
router.post(
  '/login',
  ipBlockGuard,
  loginLimiter,
  stashCaptchaToken,
  validate(loginSchema),
  requireCaptchaAfterFailures,
  authController.login
);
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
  sensitiveLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/password/reset',
  validate(resetPasswordSchema),
  authController.resetPassword
);

// MFA. setup/enable/disable require a full session; verify completes a login
// that is in the pending-MFA state and so runs without requireAuth.
router.post('/mfa/setup', requireAuth, mfaController.setup);
router.post('/mfa/enable', requireAuth, validate(mfaCodeSchema), mfaController.enable);
router.post('/mfa/disable', requireAuth, validate(mfaCodeSchema), mfaController.disable);
router.post('/mfa/verify', validate(mfaVerifySchema), mfaController.verify);

// Active sessions. '/sessions/others' is declared before '/sessions/:id' so it
// isn't captured by the param route.
router.get('/sessions', requireAuth, sessionController.listSessions);
router.delete('/sessions/others', requireAuth, sessionController.revokeOthers);
router.delete('/sessions/:id', requireAuth, sessionController.revokeOne);

module.exports = router;
