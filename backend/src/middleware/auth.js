// Authentication guard. Confirms a real session exists and enforces the
// 24-hour absolute session lifetime (the rolling cookie only covers idle
// timeout). Identity is read from the server-side session only — never from
// anything the client sends.
const { ABSOLUTE_TIMEOUT_MS } = require('../config/session');

function destroy(req) {
  return new Promise((resolve) => req.session.destroy(() => resolve()));
}

async function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const age = Date.now() - (req.session.createdAt || 0);
  if (age > ABSOLUTE_TIMEOUT_MS) {
    await destroy(req);
    res.clearCookie('ecolend.sid');
    return res.status(401).json({ error: 'Session expired' });
  }
  req.userId = req.session.userId;
  req.role = req.session.role;
  return next();
}

module.exports = { requireAuth };
