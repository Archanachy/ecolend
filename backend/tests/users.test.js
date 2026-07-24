// Tests for profile read/update: auth required, mass-assignment blocked,
// phone/address encrypted at rest, and the public profile leaking nothing
// sensitive.
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

async function registerAndLogin(email) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'U', email, password: STRONG_PASSWORD });
  await agent.post('/api/auth/login').send({ email, password: STRONG_PASSWORD });
  return agent;
}

test('GET /users/me requires authentication', async () => {
  assert.equal((await request(app).get('/api/users/me')).status, 401);
});

test('GET /users/me returns own profile without secret fields', async () => {
  const agent = await registerAndLogin('me@example.com');
  const res = await agent.get('/api/users/me');
  assert.equal(res.status, 200);
  assert.equal(res.body.email, 'me@example.com');
  const raw = JSON.stringify(res.body);
  assert.ok(!raw.includes('passwordHash'));
  assert.ok(!raw.includes('mfaSecret'));
});

test('PATCH /users/me whitelists fields and rejects extras like role', async () => {
  const agent = await registerAndLogin('ma@example.com');
  const res = await agent.patch('/api/users/me').send({ role: 'admin', bio: 'hi' });
  assert.equal(res.status, 400); // strict schema rejects unknown "role"

  const User = require('../src/models/user.model');
  const user = await User.findOne({ email: 'ma@example.com' });
  assert.equal(user.role, 'user'); // unchanged
});

test('phone and address are stored encrypted and returned decrypted to the owner', async () => {
  const agent = await registerAndLogin('enc@example.com');
  const phone = '+977-9800000000';
  const patch = await agent.patch('/api/users/me').send({ phone, address: '123 Green St' });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.profile.phone, phone); // decrypted for the owner

  const User = require('../src/models/user.model');
  const user = await User.findOne({ email: 'enc@example.com' });
  assert.ok(user.profile.phoneEncrypted && user.profile.phoneEncrypted !== phone);
  assert.match(user.profile.phoneEncrypted, /^[^:]+:[^:]+:[^:]+$/); // iv:tag:ciphertext
});

test('public profile exposes only non-sensitive fields', async () => {
  const owner = await registerAndLogin('owner@example.com');
  await owner.patch('/api/users/me').send({ phone: '+977-9811111111', bio: 'Lender' });
  const User = require('../src/models/user.model');
  const ownerDoc = await User.findOne({ email: 'owner@example.com' });

  // A guest (no session) can view the public profile.
  const res = await request(app).get(`/api/users/${ownerDoc._id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.profile.bio, 'Lender');
  const raw = JSON.stringify(res.body);
  assert.ok(!raw.includes('@example.com')); // no email
  assert.ok(!raw.includes('9811111111')); // no phone
  assert.equal(res.body.profile.phone, undefined);
});

test('an invalid profile id returns 404', async () => {
  assert.equal((await request(app).get('/api/users/not-an-id')).status, 404);
});

test('data export returns only the caller\'s own data and requires auth', async () => {
  assert.equal((await request(app).get('/api/users/me/export')).status, 401);
  const agent = await registerAndLogin('export@example.com');
  const res = await agent.get('/api/users/me/export');
  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, 'export@example.com');
  assert.ok(Array.isArray(res.body.listings));
  assert.ok(Array.isArray(res.body.bookings));
  assert.match(res.headers['content-disposition'] || '', /attachment/);
});

test('a deletion request soft-deletes the account and ends the session', async () => {
  const agent = await registerAndLogin('bye@example.com');
  const res = await agent.post('/api/users/me/delete-request');
  assert.equal(res.status, 200);
  const User = require('../src/models/user.model');
  const user = await User.findOne({ email: 'bye@example.com' });
  assert.equal(user.status, 'deleted_pending');
  assert.equal((await agent.get('/api/auth/me')).status, 401); // session revoked
});
