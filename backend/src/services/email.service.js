// Email service. In development there is no real SMTP: the message is printed
// to the console so the tester can follow the link, and only the recipient and
// subject (never the link/token) are written to the structured logs. In
// production this is where a real transport (SMTP / provider API) is wired in.
const { logger } = require('../middleware/logger');

async function sendMail({ to, subject, text }) {
  // Structured log records metadata only — never the body or any token.
  logger.info('email.sent', { to, subject });

  if (process.env.NODE_ENV !== 'production') {
    // Dev transport: surface the full message (including any link) on stdout.
    // eslint-disable-next-line no-console
    console.log(`\n[DEV EMAIL]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
  }
}

module.exports = { sendMail };
