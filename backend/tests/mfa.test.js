// Integration tests for MFA: enrolment, encrypted-at-rest secret, login
// requiring the second factor, TOTP verification, and single-use backup codes.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { authenticator } = require('otplib');
const { setup, teardown, clearDb, STRONG_PASSWORD } = require('./helpers');

let app;

before(async () => {
  ({ app } = await setup());
});
after(teardown);
beforeEach(clearDb);

// Register, log in, and enrol MFA. Returns the agent and the TOTP secret.
async function enrolMfa(email = 'mfa@example.com') {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'M', email, password: STRONG_PASSWORD });
  await agent.post('/api/auth/login').send({ email, password: STRONG_PASSWORD });

  const setupRes = await agent.post('/api/auth/mfa/setup');
  assert.equal(setupRes.status, 200);
  assert.match(setupRes.body.qr, /^data:image\/png;base64,/);
  const secret = setupRes.body.secret;

  const code = authenticator.generate(secret);
  const enableRes = await agent.post('/api/auth/mfa/enable').send({ code });
  assert.equal(enableRes.status, 200);
  assert.equal(enableRes.body.backupCodes.length, 10);
  return { agent, email, secret, backupCodes: enableRes.body.backupCodes };
}

test('MFA secret is stored encrypted, not in plaintext', async () => {
  const { secret } = await enrolMfa('enc@example.com');
  const User = require('../src/models/user.model');
  const user = await User.findOne({ email: 'enc@example.com' });
  assert.equal(user.mfaEnabled, true);
  assert.ok(user.mfaSecret && user.mfaSecret !== secret); // ciphertext, not the raw secret
  assert.match(user.mfaSecret, /^[^:]+:[^:]+:[^:]+$/); // iv:tag:ciphertext
  // Backup codes are hashed, never stored in the clear.
  assert.ok(user.mfaBackupCodes.every((h) => h.startsWith('$argon2')));
});

test('login with MFA enabled does not authenticate on password alone', async () => {
  const { secret } = await enrolMfa('login@example.com');
  const fresh = request.agent(app);
  const res = await fresh
    .post('/api/auth/login')
    .send({ email: 'login@example.com', password: STRONG_PASSWORD });
  assert.equal(res.status, 200);
  assert.equal(res.body.mfaRequired, true);
  assert.equal(res.body.userId, undefined);
  // The pending session grants no access.
  assert.equal((await fresh.get('/api/auth/me')).status, 401);

  // Completing MFA authenticates.
  const verify = await fresh
    .post('/api/auth/mfa/verify')
    .send({ code: authenticator.generate(secret) });
  assert.equal(verify.status, 200);
  assert.equal((await fresh.get('/api/auth/me')).status, 200);
});

test('a wrong TOTP code is rejected at login', async () => {
  await enrolMfa('wrong@example.com');
  const fresh = request.agent(app);
  await fresh.post('/api/auth/login').send({ email: 'wrong@example.com', password: STRONG_PASSWORD });
  const res = await fresh.post('/api/auth/mfa/verify').send({ code: '000000' });
  assert.equal(res.status, 401);
  assert.equal((await fresh.get('/api/auth/me')).status, 401);
});

test('a backup code works once and is then consumed', async () => {
  const { backupCodes } = await enrolMfa('backup@example.com');
  const oneCode = backupCodes[0];

  const first = request.agent(app);
  await first.post('/api/auth/login').send({ email: 'backup@example.com', password: STRONG_PASSWORD });
  const use1 = await first.post('/api/auth/mfa/verify').send({ backupCode: oneCode });
  assert.equal(use1.status, 200);

  // The same backup code cannot be reused.
  const second = request.agent(app);
  await second.post('/api/auth/login').send({ email: 'backup@example.com', password: STRONG_PASSWORD });
  const use2 = await second.post('/api/auth/mfa/verify').send({ backupCode: oneCode });
  assert.equal(use2.status, 401);
});

test('mfa/verify with no pending login is rejected', async () => {
  const res = await request(app).post('/api/auth/mfa/verify').send({ code: '123456' });
  assert.equal(res.status, 401);
});
