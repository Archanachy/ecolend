// Server-side session middleware (express-session + connect-mongo). Sessions
// are stored in MongoDB so they can be revoked instantly server-side — chosen
// over stateless JWT precisely so logout/password-change/suspension can kill a
// session immediately. Cookie flags: HttpOnly + SameSite=Strict always; Secure
// in production (local http dev cannot send Secure cookies).
const session = require('express-session');
const MongoStore = require('connect-mongo');
const env = require('./env');

// 30-minute idle timeout via a rolling cookie (maxAge resets on each response);
// the 24-hour absolute cap is enforced separately in requireAuth against the
// session's createdAt, since a rolling cookie alone has no absolute limit.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1000;

function sessionMiddleware() {
  // Cookie is hardened via httpOnly + sameSite=strict + maxAge, with secure
  // enabled in production. Three Semgrep express-cookie-settings rules are
  // suppressed with justification below:
  //  - no-secure: `secure` is environment-conditional (true in prod; cannot be
  //    true over local http dev), which the rule cannot express.
  //  - no-domain: left unset intentionally so the cookie is host-only, which is
  //    tighter scope than pinning a domain.
  //  - no-expires: expiry is handled by `maxAge` (idle) plus the absolute cap in
  //    requireAuth; `expires` would be redundant.
  // nosemgrep: javascript.express.security.audit.express-cookie-settings.express-cookie-session-no-secure, javascript.express.security.audit.express-cookie-settings.express-cookie-session-no-domain, javascript.express.security.audit.express-cookie-settings.express-cookie-session-no-expires
  return session({
    name: 'ecolend.sid',
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true, // reset idle window on activity
    store: MongoStore.create({
      mongoUrl: env.mongoUri,
      collectionName: 'sessions',
      ttl: IDLE_TIMEOUT_MS / 1000,
    }),
    cookie: {
      httpOnly: true,
      secure: env.isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: IDLE_TIMEOUT_MS,
    },
  });
}

module.exports = { sessionMiddleware, IDLE_TIMEOUT_MS, ABSOLUTE_TIMEOUT_MS };
