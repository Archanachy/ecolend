// Device binding. A session is tied to a SHA-256 hash of the User-Agent plus
// the client IP's /24 prefix. Using the /24 prefix (not the full IP) tolerates
// minor IP shifts on the same network while still catching a session used from
// a clearly different origin.
const crypto = require('crypto');

function ipPrefix(ip) {
  if (!ip) return '';
  const v4 = ip.replace('::ffff:', '');
  const parts = v4.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  return v4; // IPv6: bind to the full address
}

function deviceHash(req) {
  const ua = req.headers['user-agent'] || '';
  const raw = `${ua}|${ipPrefix(req.ip)}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = { deviceHash, ipPrefix };
