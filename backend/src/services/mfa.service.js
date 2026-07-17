// TOTP multi-factor authentication (otplib) plus single-use backup codes.
// The TOTP secret is generated here and stored encrypted by the caller; backup
// codes are shown once and stored only as argon2id hashes.
const crypto = require('crypto');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const argon2 = require('argon2');

// Allow one 30s step of clock drift either side.
authenticator.options = { window: 1 };

function generateSecret() {
  return authenticator.generateSecret();
}

// otpauth:// URI encoded into a scannable QR data URL for authenticator apps.
function keyUri(email, secret) {
  return authenticator.keyuri(email, 'EcoLend', secret);
}

function qrDataUrl(otpauthUri) {
  return qrcode.toDataURL(otpauthUri);
}

function verifyToken(token, secret) {
  try {
    return authenticator.verify({ token: String(token), secret });
  } catch {
    return false;
  }
}

// Ten human-friendly codes (e.g. "a1b2-c3d4"). Returns the plaintext (shown to
// the user once) and their hashes (stored).
async function generateBackupCodes(count = 10) {
  const plain = [];
  for (let i = 0; i < count; i += 1) {
    const raw = crypto.randomBytes(4).toString('hex'); // 8 hex chars
    plain.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  const hashes = await Promise.all(plain.map((c) => argon2.hash(c)));
  return { plain, hashes };
}

// Returns the index of the matching (unused) backup-code hash, or -1.
async function findBackupCode(code, hashes = []) {
  const normalized = String(code).trim().toLowerCase();
  for (let i = 0; i < hashes.length; i += 1) {
    if (await argon2.verify(hashes[i], normalized).catch(() => false)) return i;
  }
  return -1;
}

module.exports = {
  generateSecret,
  keyUri,
  qrDataUrl,
  verifyToken,
  generateBackupCodes,
  findBackupCode,
};
