// Tests for password expiry, device binding, and active-session management.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { setup, teardown, clearDb, STRONG_PASSWORD } = require('./helpers');

let app;

before(async () => {
  ({ app } = await setup());
});
after(teardown);
beforeEach(clearDb);

function register(email) {
  return request(app).post('/api/auth/register').send({ name: 'H', email, password: STRONG_PASSWORD });
}
function login(agent, email) {
  return agent.post('/api/auth/login').send({ email, password: STRONG_PASSWORD });
}

test('an expired password blocks login and asks for a reset', async () => {
  await register('expired@example.com');
  const User = require('../src/models/user.model');
  const old = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
  await User.updateOne({ email: 'expired@example.com' }, { passwordChangedAt: old });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'expired@example.com', password: STRONG_PASSWORD });
  assert.equal(res.status, 403);
  assert.equal(res.body.passwordExpired, true);
});

test('a session used from a new device is forced to re-authenticate, with an alert', async () => {
  await register('device@example.com');
  const agent = request.agent(app);
  await login(agent, 'device@example.com');
  assert.equal((await agent.get('/api/auth/me')).status, 200);

  // Same session, different User-Agent -> device hash mismatch -> 401.
  const res = await agent.get('/api/auth/me').set('User-Agent', 'A-Totally-Different-Browser/9');
  assert.equal(res.status, 401);

  const SecurityAlert = require('../src/models/securityAlert.model');
  const alert = await SecurityAlert.findOne({ type: 'new_device_login' });
  assert.ok(alert, 'a new_device_login alert should be recorded');

  // The session was destroyed, so even the original UA is now unauthenticated.
  assert.equal((await agent.get('/api/auth/me')).status, 401);
});

test('a user can list and revoke their other sessions', async () => {
  await register('multi@example.com');
  const a = request.agent(app);
  const b = request.agent(app);
  await login(a, 'multi@example.com');
  await login(b, 'multi@example.com');

  const list = await a.get('/api/auth/sessions');
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 2);
  assert.equal(list.body.filter((s) => s.current).length, 1);

  const revoke = await a.delete('/api/auth/sessions/others');
  assert.equal(revoke.status, 200);
  assert.equal(revoke.body.revoked, 1);

  assert.equal((await a.get('/api/auth/me')).status, 200); // current kept
  assert.equal((await b.get('/api/auth/me')).status, 401); // other revoked
});

test('a user cannot revoke another user\'s session (IDOR guard)', async () => {
  await register('owner@example.com');
  await register('attacker@example.com');
  const owner = request.agent(app);
  const attacker = request.agent(app);
  await login(owner, 'owner@example.com');
  await login(attacker, 'attacker@example.com');

  const ownerSid = (await owner.get('/api/auth/sessions')).body[0].id;
  const res = await attacker.delete(`/api/auth/sessions/${ownerSid}`);
  assert.equal(res.status, 404); // not found for the attacker

  assert.equal((await owner.get('/api/auth/me')).status, 200); // still valid
});
