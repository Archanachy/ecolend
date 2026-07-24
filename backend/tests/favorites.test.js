// Saved listings: auth required, idempotent save/unsave, and strict per-user
// scoping (one user can never see or affect another's favorites).
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

async function makeUser(email) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: email, email, password: STRONG_PASSWORD });
  await require('../src/models/user.model').updateOne({ email }, { emailVerified: true });
  await agent.post('/api/auth/login').send({ email, password: STRONG_PASSWORD });
  return agent;
}

async function makeListing(agent) {
  const res = await agent.post('/api/listings').send({
    title: 'Drill', category: 'Power Tools', depositAmount: 2000, feePerDay: 100,
  });
  return res.body._id;
}

test('favorites require authentication', async () => {
  assert.equal((await request(app).get('/api/favorites')).status, 401);
});

test('saving is idempotent and shows up in the list', async () => {
  const owner = await makeUser('own@ex.com');
  const listingId = await makeListing(owner);
  const user = await makeUser('fav@ex.com');

  assert.equal((await user.post(`/api/favorites/${listingId}`)).status, 201);
  // Saving twice must not error or duplicate.
  assert.equal((await user.post(`/api/favorites/${listingId}`)).status, 201);

  const list = await user.get('/api/favorites');
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0]._id, listingId);

  const ids = await user.get('/api/favorites/ids');
  assert.deepEqual(ids.body, [listingId]);
});

test('unsaving is idempotent', async () => {
  const owner = await makeUser('own2@ex.com');
  const listingId = await makeListing(owner);
  const user = await makeUser('fav2@ex.com');

  await user.post(`/api/favorites/${listingId}`);
  assert.equal((await user.delete(`/api/favorites/${listingId}`)).status, 200);
  // Deleting again is a no-op, not an error.
  assert.equal((await user.delete(`/api/favorites/${listingId}`)).status, 200);
  assert.equal((await user.get('/api/favorites')).body.length, 0);
});

test("favorites are scoped per user", async () => {
  const owner = await makeUser('own3@ex.com');
  const listingId = await makeListing(owner);
  const a = await makeUser('a@ex.com');
  const b = await makeUser('b@ex.com');

  await a.post(`/api/favorites/${listingId}`);
  // B saved nothing, so B sees nothing.
  assert.equal((await b.get('/api/favorites')).body.length, 0);
  // B unsaving does not affect A.
  await b.delete(`/api/favorites/${listingId}`);
  assert.equal((await a.get('/api/favorites')).body.length, 1);
});

test('saving a non-existent listing returns 404', async () => {
  const user = await makeUser('fav4@ex.com');
  const missing = '6a5760985fd9447258d38467';
  assert.equal((await user.post(`/api/favorites/${missing}`)).status, 404);
  assert.equal((await user.post('/api/favorites/not-an-id')).status, 404);
});
