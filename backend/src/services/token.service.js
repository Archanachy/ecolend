// Stateless, single-purpose signed tokens for email links (verification and
// password reset). An HMAC over the payload means no token needs to be stored
// in the database, and a `purpose` field domain-separates the two flows so a
// verification token can never be replayed as a reset token. Tokens carry an
// expiry and are compared in constant time.
const crypto = require('crypto');
const env = require('./../config/env');

function sign(data) {
  return crypto.createHmac('sha256', env.sessionSecret).update(data).digest('base64url');
}

function createToken(payload, ttlMs) {
  const body = { ...payload, exp: Date.now() + ttlMs };
  const data = Buffer.from(JSON.stringify(body)).toString('base64url');
  return `${data}.${sign(data)}`;
}

function verifyToken(token, purpose) {
  if (!token || typeof token !== 'string') return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;

  const expected = sign(data);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let body;
  try {
    body = JSON.parse(Buffer.from(data, 'base64url').toString());
  } catch {
    return null;
  }
  if (body.purpose !== purpose) return null;
  if (!body.exp || Date.now() > body.exp) return null;
  return body;
}

module.exports = { createToken, verifyToken };
