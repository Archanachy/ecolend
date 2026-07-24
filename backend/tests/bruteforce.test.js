// Tests for account lockout, the repeated-failure CAPTCHA signal, and IP-based
// blocking. Rate limiters are skipped under NODE_ENV=test (see rateLimiter.js),
// so these focus on the lockout/IP-block logic; the limiter itself is covered
// in rateLimiter.test.js.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { setup, teardown, clearDb, STRONG_PASSWORD } = require('./helpers');
const ipTracker = require('../src/utils/ipTracker');

let app;

before(async () => {
  ({ app } = await setup());
});
after(teardown);
beforeEach(async () => {
  await clearDb();
  ipTracker._clear();
});

async function wrongLogin(email) {
  return request(app).post('/api/auth/login').send({ email, password: 'Wrong-Passw0rd!' });
}

test('account locks after 5 failed attempts and surfaces only on a correct password', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'L', email: 'lock@example.com', password: STRONG_PASSWORD });

  for (let i = 0; i < 5; i += 1) {
    await wrongLogin('lock@example.com');
  }

  // Correct password now reveals the lockout with a 423.
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'lock@example.com', password: STRONG_PASSWORD });
  assert.equal(res.status, 423);
});

test('a CAPTCHA is signalled after repeated failures', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'C', email: 'cap@example.com', password: STRONG_PASSWORD });

  await wrongLogin('cap@example.com'); // 1
  await wrongLogin('cap@example.com'); // 2
  const third = await wrongLogin('cap@example.com'); // 3
  assert.equal(third.status, 401);
  assert.equal(third.body.captchaRequired, true);
});

test('after 3 failures the login CAPTCHA is enforced, not just signalled', async () => {
  const captcha = require('../src/middleware/captcha');
  const realVerifier = captcha.isTokenValid;
  // Register BEFORE enabling enforcement — /register is always CAPTCHA-gated,
  // so it would otherwise demand a token here too.
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'E', email: 'enf@example.com', password: STRONG_PASSWORD });

  // Opt in to enforcement and stub the provider so no network call is made.
  process.env.CAPTCHA_ENFORCE_IN_TEST = '1';
  try {
    await wrongLogin('enf@example.com');
    await wrongLogin('enf@example.com');
    await wrongLogin('enf@example.com'); // account now at 3 failures

    // No token supplied -> refused before any password check.
    const noToken = await request(app)
      .post('/api/auth/login')
      .send({ email: 'enf@example.com', password: STRONG_PASSWORD });
    assert.equal(noToken.status, 400);
    assert.equal(noToken.body.captchaRequired, true);

    // Provider rejects the token -> still refused.
    captcha.isTokenValid = async () => false;
    const badToken = await request(app)
      .post('/api/auth/login')
      .send({ email: 'enf@example.com', password: STRONG_PASSWORD, captchaToken: 'bad' });
    assert.equal(badToken.status, 400);

    // Provider accepts -> the correct password now logs in.
    captcha.isTokenValid = async () => true;
    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: 'enf@example.com', password: STRONG_PASSWORD, captchaToken: 'good' });
    assert.equal(ok.status, 200);
  } finally {
    captcha.isTokenValid = realVerifier;
    delete process.env.CAPTCHA_ENFORCE_IN_TEST;
  }
});

test('an IP is blocked after 20 failed logins and an alert is raised', async () => {
  const SecurityAlert = require('../src/models/securityAlert.model');
  for (let i = 0; i < ipTracker.MAX_FAILURES; i += 1) {
    // Distinct unknown emails so this is IP-level, not per-account, failure.
    await wrongLogin(`ghost${i}@example.com`);
  }
  const blocked = await wrongLogin('ghost-again@example.com');
  assert.equal(blocked.status, 429);

  const alert = await SecurityAlert.findOne({ type: 'rate_limit_triggered' });
  assert.ok(alert, 'a rate_limit_triggered alert should be recorded');
});
