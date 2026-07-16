// Email service. When SMTP is configured (MAIL_HOST set) it sends real mail via
// nodemailer; otherwise it falls back to a console transport that prints the
// message — including any verification/reset link — to stdout so a developer can
// follow the flow without a mail server. Either way, the structured log records
// only the recipient and subject, never the body or any token.
const nodemailer = require('nodemailer');
const env = require('../config/env');
const { logger } = require('../middleware/logger');

// Transport is built once, lazily, and reused across sends.
let transporter;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure, // true for 465 (implicit TLS), false for 587 (STARTTLS)
    auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
  });
  return transporter;
}

async function sendMail({ to, subject, text }) {
  // Structured log records metadata only — never the body or any token.
  logger.info('email.sent', { to, subject });

  // Never open a real SMTP connection from the test suite, whatever is in .env.
  if (env.mail.enabled && process.env.NODE_ENV !== 'test') {
    // Real SMTP delivery.
    await getTransporter().sendMail({ from: env.mail.from, to, subject, text });
    return;
  }

  if (!env.isProd) {
    // Dev fallback: surface the full message (including any link) on stdout.
    console.log(`\n[DEV EMAIL]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }

  // Production with no transport configured — fail loudly in logs rather than
  // silently dropping account-security email.
  logger.error('email.not_configured', { to, subject });
}

module.exports = { sendMail };
