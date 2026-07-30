// Application-layer field encryption using AES-256-GCM. Used for data that must
// be recoverable but never stored in the clear: the MFA secret, phone number,
// and address. GCM gives confidentiality plus an authentication tag, so any
// tampering with the ciphertext is detected on decrypt.
//
// Stored format: "<iv>:<authTag>:<ciphertext>", each part base64. The key comes
// from FIELD_ENC_KEY (64 hex chars = 256-bit) and is never committed.
const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit nonce, the recommended size for GCM
const AUTH_TAG_BYTES = 16; // 128-bit tag; never accept truncated GCM tags

function getKey() {
  // Read the live env var (dotenv populates process.env), falling back to the
  // value captured at load time — avoids a stale cache when the key is set
  // after this module is first required (e.g. in tests).
  const hex = process.env.FIELD_ENC_KEY || env.fieldEncKey;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('FIELD_ENC_KEY must be set to 64 hex characters (256-bit).');
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext) {
  if (plaintext == null || plaintext === '') return plaintext;
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv, {
    authTagLength: AUTH_TAG_BYTES,
  });
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

function decrypt(payload) {
  if (payload == null || payload === '') return payload;
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Malformed ciphertext.');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  if (iv.length !== IV_BYTES || tag.length !== AUTH_TAG_BYTES) {
    throw new Error('Malformed ciphertext.');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv, {
    authTagLength: AUTH_TAG_BYTES,
  });
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = { encrypt, decrypt };
