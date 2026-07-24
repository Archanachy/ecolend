// Unit tests for the AES-256-GCM field encryption service.
const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.FIELD_ENC_KEY = 'a'.repeat(64); // 64 hex chars = 256-bit test key
const { encrypt, decrypt } = require('../src/services/crypto.service');

test('round-trips a value', () => {
  const secret = '+977-9800000000';
  const ct = encrypt(secret);
  assert.notEqual(ct, secret);
  assert.equal(decrypt(ct), secret);
});

test('produces different ciphertext each time (random IV)', () => {
  assert.notEqual(encrypt('same value'), encrypt('same value'));
});

test('detects tampering via the GCM auth tag', () => {
  const ct = encrypt('sensitive');
  const [iv, tag] = ct.split(':');
  const tampered = `${iv}:${tag}:${Buffer.from('different-bytes').toString('base64')}`;
  assert.throws(() => decrypt(tampered));
});

test('passes null and empty through unchanged', () => {
  assert.equal(encrypt(null), null);
  assert.equal(encrypt(''), '');
  assert.equal(decrypt(null), null);
});
