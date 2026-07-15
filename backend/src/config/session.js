// Server-side session middleware (express-session + connect-mongo). Sessions
// are stored in MongoDB so they can be revoked instantly server-side — chosen
// over stateless JWT precisely so logout/password-change/suspension can kill a
// session immediately. Cookie flags: HttpOnly + SameSite=Strict always; Secure
// in production (local http dev cannot send Secure cookies).
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const env = require('./env');

// 30-minute idle timeout via a rolling cookie (maxAge resets on each response);
// the 24-hour absolute cap is enforced separately in requireAuth against the
// session's createdAt, since a rolling cookie alone has no absolute limit.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1000;

// The store is created once and reused. A handle is kept so tests can close it
// cleanly (otherwise the open Mongo client keeps the process alive).
let store = null;
function getStore() {
  if (!store) {
    // Read the live env var at creation time (not a value cached when env.js
    // was first required) so the store always targets the same database the
    // app is actually using — including when a test swaps in an in-memory URI.
    store = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || env.mongoUri,
      collectionName: 'sessions',
      ttl: IDLE_TIMEOUT_MS / 1000,
    });
  }
  return store;
}

async function closeSessionStore() {
  if (store) {
    await store.close();
    store = null;
  }
}

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
    store: getStore(),
    cookie: {
      httpOnly: true,
      secure: env.isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: IDLE_TIMEOUT_MS,
    },
  });
}

// Delete every stored session for a user — used when a password changes or an
// account is suspended so those sessions are revoked immediately, everywhere.
// connect-mongo serialises each session as a JSON string (not an embedded
// object), so we read the sessions, parse them, and delete the ones whose
// userId matches. Session counts are small and revocation must be reliable, so
// a scan is the right trade-off here over a fragile string query.
async function destroyUserSessions(userId) {
  const coll = mongoose.connection.collection('sessions');
  const target = String(userId);
  const ids = [];
  const cursor = coll.find({}, { projection: { session: 1 } });
  for await (const doc of cursor) {
    try {
      const data = typeof doc.session === 'string' ? JSON.parse(doc.session) : doc.session;
      if (data && String(data.userId) === target) ids.push(doc._id);
    } catch {
      // Ignore any session document that cannot be parsed.
    }
  }
  if (ids.length) await coll.deleteMany({ _id: { $in: ids } });
  return ids.length;
}

module.exports = {
  sessionMiddleware,
  destroyUserSessions,
  closeSessionStore,
  IDLE_TIMEOUT_MS,
  ABSOLUTE_TIMEOUT_MS,
};
