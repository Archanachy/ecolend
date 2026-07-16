// Loads environment variables once and exposes them as a typed config object.
// Never hardcode secrets or URLs elsewhere — read them from here.
require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ecolend',
  sessionSecret: process.env.SESSION_SECRET || 'dev-insecure-session-secret',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  captcha: {
    siteKey: process.env.CAPTCHA_SITE_KEY || '',
    secretKey: process.env.CAPTCHA_SECRET_KEY || '',
  },
  // 256-bit key as 64 hex chars; required only for field encryption operations.
  fieldEncKey: process.env.FIELD_ENC_KEY || '',
  // SMTP transport for verification / password-reset email. When host is unset
  // the email service falls back to a console transport (dev only).
  mail: {
    host: process.env.MAIL_HOST || '',
    port: Number(process.env.MAIL_PORT) || 587,
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASS || '',
    from: process.env.MAIL_FROM || 'no-reply@ecolend.local',
  },
};

env.isProd = env.nodeEnv === 'production';
// SMTP is "enabled" once a host is configured; port 465 implies implicit TLS.
env.mail.enabled = Boolean(env.mail.host);
env.mail.secure = env.mail.port === 465;

module.exports = env;
