// Tests for listings: ownership derived from the session, whitelist on writes,
// public browse, and the IDOR/authorization guards on edit/delete.
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

async function userAgent(email, role) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'U', email, password: STRONG_PASSWORD });
  await require('../src/models/user.model').updateOne({ email }, { emailVerified: true });
  if (role) {
    const User = require('../src/models/user.model');
    await User.updateOne({ email }, { role });
  }
  await agent.post('/api/auth/login').send({ email, password: STRONG_PASSWORD });
  return agent;
}

const sampleListing = {
  title: 'Power Drill',
  category: 'tools',
  depositAmount: 2000,
  feePerDay: 150,
  location: 'Kathmandu',
};

test('an unverified email cannot create a listing (403)', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'NV', email: 'nv@example.com', password: STRONG_PASSWORD });
  await agent.post('/api/auth/login').send({ email: 'nv@example.com', password: STRONG_PASSWORD });
  const res = await agent.post('/api/listings').send(sampleListing);
  assert.equal(res.status, 403);
  assert.equal(res.body.emailVerificationRequired, true);
});

test('creating a listing requires authentication', async () => {
  const res = await request(app).post('/api/listings').send(sampleListing);
  assert.equal(res.status, 401);
});

test('ownerId is taken from the session, not the request body', async () => {
  const a = await userAgent('owner@example.com');
  const res = await a
    .post('/api/listings')
    .send({ ...sampleListing, ownerId: '000000000000000000000000' });
  // ownerId is not in the schema, so the strict validator rejects it.
  assert.equal(res.status, 400);

  const clean = await a.post('/api/listings').send(sampleListing);
  assert.equal(clean.status, 201);
  const User = require('../src/models/user.model');
  const me = await User.findOne({ email: 'owner@example.com' });
  assert.equal(clean.body.ownerId, me._id.toString());
});

test('browse returns only active listings and supports filtering', async () => {
  const a = await userAgent('lister@example.com');
  await a.post('/api/listings').send({ ...sampleListing, title: 'Ladder', category: 'tools' });
  await a.post('/api/listings').send({ ...sampleListing, title: 'Tent', category: 'camping' });

  const all = await request(app).get('/api/listings');
  assert.equal(all.status, 200);
  assert.equal(all.body.items.length, 2);

  const tools = await request(app).get('/api/listings?category=tools');
  assert.equal(tools.body.items.length, 1);
  assert.equal(tools.body.items[0].title, 'Ladder');
});

test('a user cannot edit or delete another user\'s listing (IDOR)', async () => {
  const owner = await userAgent('a@example.com');
  const attacker = await userAgent('b@example.com');
  const created = await owner.post('/api/listings').send(sampleListing);
  const id = created.body._id;

  assert.equal((await attacker.patch(`/api/listings/${id}`).send({ title: 'Hacked' })).status, 403);
  assert.equal((await attacker.delete(`/api/listings/${id}`)).status, 403);

  // Owner can.
  assert.equal((await owner.patch(`/api/listings/${id}`).send({ title: 'Renamed' })).status, 200);
});

test('an admin can delete any listing', async () => {
  const owner = await userAgent('u1@example.com');
  const admin = await userAgent('admin@example.com', 'admin');
  const created = await owner.post('/api/listings').send(sampleListing);
  const res = await admin.delete(`/api/listings/${created.body._id}`);
  assert.equal(res.status, 200);
});

test('NoSQL operator injection in a filter is neutralised', async () => {
  const a = await userAgent('c@example.com');
  await a.post('/api/listings').send(sampleListing);
  // category[$ne]= would match everything if passed through as an operator.
  const res = await request(app).get('/api/listings?category[$ne]=nope');
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 0); // coerced to a string, matches nothing
});
