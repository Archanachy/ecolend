// Integration tests for the authentication flow, run against an in-memory
// MongoDB. These lock in the security properties: mass-assignment defence,
// password policy, no user enumeration, session lifecycle and revocation,
// email verification, and single-use time-limited password reset.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { setup, teardown, clearDb, STRONG_PASSWORD } = require('./helpers');
const { createToken } = require('../src/services/token.service');

let app;

before(async () => {
  ({ app } = await setup());
});

after(teardown);

beforeEach(clearDb);

function registerUser(email = 'user@example.com', password = STRONG_PASSWORD) {
  return request(app).post('/api/auth/register').send({ name: 'Test', email, password });
}

test('registers a valid user and stores an argon2id hash, not plaintext', async () => {
  const res = await registerUser();
  assert.equal(res.status, 201);
  const User = require('../src/models/user.model');
  const user = await User.findOne({ email: 'user@example.com' });
  assert.equal(user.role, 'user');
  assert.equal(user.emailVerified, false);
  assert.ok(user.passwordHash.startsWith('$argon2id$'));
  assert.ok(!JSON.stringify(user).includes(STRONG_PASSWORD));
});

test('rejects a weak password', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'T', email: 'weak@example.com', password: 'weak' });
  assert.equal(res.status, 400);
});

test('blocks mass assignment of extra fields (e.g. role)', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'T', email: 'ma@example.com', password: STRONG_PASSWORD, role: 'admin' });
  assert.equal(res.status, 400);
});

test('duplicate email registration returns 409, not 500', async () => {
  await registerUser('dup@example.com');
  const res = await registerUser('dup@example.com');
  assert.equal(res.status, 409);
});

test('login rejects wrong password and unknown email with the same generic 401', async () => {
  await registerUser('login@example.com');
  const wrong = await request(app)
    .post('/api/auth/login')
    .send({ email: 'login@example.com', password: 'Wrong-Passw0rd!' });
  const unknown = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ghost@example.com', password: STRONG_PASSWORD });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(wrong.body, unknown.body);
});

test('login succeeds and issues an HttpOnly, SameSite=Strict cookie', async () => {
  await registerUser('ok@example.com');
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ok@example.com', password: STRONG_PASSWORD });
  assert.equal(res.status, 200);
  const cookie = (res.headers['set-cookie'] || [])[0] || '';
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
});

test('suspended account is only revealed after a correct password', async () => {
  await registerUser('susp@example.com');
  const User = require('../src/models/user.model');
  await User.updateOne({ email: 'susp@example.com' }, { status: 'suspended' });
  const wrong = await request(app)
    .post('/api/auth/login')
    .send({ email: 'susp@example.com', password: 'Wrong-Passw0rd!' });
  const right = await request(app)
    .post('/api/auth/login')
    .send({ email: 'susp@example.com', password: STRONG_PASSWORD });
  assert.equal(wrong.status, 401); // generic, does not reveal suspension
  assert.equal(right.status, 403); // revealed only with valid credentials
});

test('me requires auth; logout ends the session', async () => {
  await registerUser('sess@example.com');
  const agent = request.agent(app);
  assert.equal((await agent.get('/api/auth/me')).status, 401);
  await agent.post('/api/auth/login').send({ email: 'sess@example.com', password: STRONG_PASSWORD });
  assert.equal((await agent.get('/api/auth/me')).status, 200);
  await agent.post('/api/auth/logout');
  assert.equal((await agent.get('/api/auth/me')).status, 401);
});

test('email verification token flips emailVerified; wrong purpose is rejected', async () => {
  await registerUser('verify@example.com');
  const User = require('../src/models/user.model');
  const user = await User.findOne({ email: 'verify@example.com' });

  const wrongPurpose = createToken({ uid: user._id.toString(), purpose: 'reset_password' }, 60000);
  assert.equal(
    (await request(app).post('/api/auth/verify-email').send({ token: wrongPurpose })).status,
    400
  );

  const good = createToken({ uid: user._id.toString(), purpose: 'verify_email' }, 60000);
  assert.equal((await request(app).post('/api/auth/verify-email').send({ token: good })).status, 200);
  const after = await User.findOne({ email: 'verify@example.com' });
  assert.equal(after.emailVerified, true);
});

test('password reset is single-use, blocks reuse, and revokes existing sessions', async () => {
  const newPw = 'Fresh-Passw0rd-99!';
  await registerUser('reset@example.com');
  const User = require('../src/models/user.model');
  const user = await User.findOne({ email: 'reset@example.com' });

  // A logged-in device.
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: 'reset@example.com', password: STRONG_PASSWORD });
  assert.equal((await agent.get('/api/auth/me')).status, 200);

  const token = createToken(
    { uid: user._id.toString(), purpose: 'reset_password', pwc: user.passwordChangedAt.getTime() },
    3600000
  );

  // Reusing the current password is blocked.
  const reuse = await request(app)
    .post('/api/auth/password/reset')
    .send({ token, password: STRONG_PASSWORD });
  assert.equal(reuse.status, 400);

  // Valid reset succeeds.
  const ok = await request(app).post('/api/auth/password/reset').send({ token, password: newPw });
  assert.equal(ok.status, 200);

  // The same token cannot be used again (single-use).
  const again = await request(app)
    .post('/api/auth/password/reset')
    .send({ token, password: 'Another-Passw0rd-7!' });
  assert.equal(again.status, 400);

  // The pre-existing session was revoked.
  assert.equal((await agent.get('/api/auth/me')).status, 401);

  // Old password no longer works; new one does.
  assert.equal(
    (await request(app).post('/api/auth/login').send({ email: 'reset@example.com', password: STRONG_PASSWORD })).status,
    401
  );
  assert.equal(
    (await request(app).post('/api/auth/login').send({ email: 'reset@example.com', password: newPw })).status,
    200
  );
});
