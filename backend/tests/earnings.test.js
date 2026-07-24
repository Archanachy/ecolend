// Lender earnings: only paid money counts, deposits are never income, and
// pre-payment / cancelled bookings are excluded.
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

const User = () => require('../src/models/user.model');
const Booking = () => require('../src/models/booking.model');

async function makeUser(email) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: email, email, password: STRONG_PASSWORD });
  await User().updateOne({ email }, { emailVerified: true });
  await agent.post('/api/auth/login').send({ email, password: STRONG_PASSWORD });
  return agent;
}

// Moves a booking straight to a status, keeping the integrity hash valid.
async function forceStatus(id, status) {
  const { computeIntegrityHash } = require('../src/utils/bookingIntegrity');
  const b = await Booking().findById(id);
  b.status = status;
  b.integrityHash = computeIntegrityHash(b);
  await b.save();
}

// Lender lists an item; borrower books it. Fee = 100/day * 2 = 200, deposit 2000.
async function booking(lender, borrower, start, end) {
  const listing = await lender.post('/api/listings').send({
    title: 'Drill', category: 'Power Tools', depositAmount: 2000, feePerDay: 100,
  });
  const res = await borrower.post('/api/bookings').send({
    listingId: listing.body._id, startDate: start, endDate: end,
  });
  return res.body._id;
}

test('earnings require authentication', async () => {
  assert.equal((await request(app).get('/api/bookings/earnings')).status, 401);
});

test('a brand-new lender has zero earnings', async () => {
  const lender = await makeUser('e0@ex.com');
  const res = await lender.get('/api/bookings/earnings');
  assert.equal(res.status, 200);
  assert.equal(res.body.totalEarned, 0);
  assert.equal(res.body.pendingEarnings, 0);
  assert.equal(res.body.recent.length, 0);
});

test('completed bookings count as earned, and deposits are excluded', async () => {
  const lender = await makeUser('e1@ex.com');
  const borrower = await makeUser('b1@ex.com');
  const id = await booking(lender, borrower, '2027-07-01', '2027-07-03');
  await forceStatus(id, 'completed');

  const res = await lender.get('/api/bookings/earnings');
  // Fee only (100 * 2 days) — the 2000 deposit must NOT be counted.
  assert.equal(res.body.totalEarned, 200);
  assert.equal(res.body.completedCount, 1);
  assert.equal(res.body.pendingEarnings, 0);
});

test('in-progress bookings are pending, not earned', async () => {
  const lender = await makeUser('e2@ex.com');
  const borrower = await makeUser('b2@ex.com');
  const id = await booking(lender, borrower, '2027-08-01', '2027-08-03');
  await forceStatus(id, 'paid');

  const res = await lender.get('/api/bookings/earnings');
  assert.equal(res.body.totalEarned, 0);
  assert.equal(res.body.pendingEarnings, 200);
  assert.equal(res.body.activeCount, 1);
});

test('a disputed booking stays visible as pending', async () => {
  const lender = await makeUser('e3@ex.com');
  const borrower = await makeUser('b3@ex.com');
  const id = await booking(lender, borrower, '2027-09-01', '2027-09-03');
  await forceStatus(id, 'disputed');

  const res = await lender.get('/api/bookings/earnings');
  assert.equal(res.body.pendingEarnings, 200);
  assert.equal(res.body.recent.length, 1);
});

test('unpaid and cancelled bookings are excluded entirely', async () => {
  const lender = await makeUser('e4@ex.com');
  const borrower = await makeUser('b4@ex.com');
  const pendingId = await booking(lender, borrower, '2027-10-01', '2027-10-03');
  const cancelledId = await booking(lender, borrower, '2027-11-01', '2027-11-03');
  await forceStatus(cancelledId, 'cancelled');
  // pendingId is left at 'requested' (never paid).

  const res = await lender.get('/api/bookings/earnings');
  assert.equal(res.body.totalEarned, 0);
  assert.equal(res.body.pendingEarnings, 0);
  assert.equal(res.body.recent.length, 0);
  assert.ok(pendingId && cancelledId);
});

test("earnings are scoped to the lender, not the borrower", async () => {
  const lender = await makeUser('e5@ex.com');
  const borrower = await makeUser('b5@ex.com');
  const id = await booking(lender, borrower, '2027-12-01', '2027-12-03');
  await forceStatus(id, 'completed');

  // The borrower earned nothing from a booking they paid for.
  const res = await borrower.get('/api/bookings/earnings');
  assert.equal(res.body.totalEarned, 0);
  assert.equal(res.body.recent.length, 0);
});
