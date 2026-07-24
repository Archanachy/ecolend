// Business-logic tests for bookings: the state machine (legal path, out-of-order
// blocked, role-gated, no re-trigger of terminal states), the IDOR guard, and
// transaction-integrity tamper detection.
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

async function makeUser(email, role) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: email, email, password: STRONG_PASSWORD });
  await require('../src/models/user.model').updateOne({ email }, { emailVerified: true });
  if (role) {
    const User = require('../src/models/user.model');
    await User.updateOne({ email }, { role });
  }
  await agent.post('/api/auth/login').send({ email, password: STRONG_PASSWORD });
  return agent;
}

async function scenario() {
  const lender = await makeUser('lender@example.com');
  const borrower = await makeUser('borrower@example.com');
  const listing = await lender.post('/api/listings').send({
    title: 'Drill', category: 'tools', depositAmount: 2000, feePerDay: 100, location: 'KTM',
  });
  const booking = await borrower.post('/api/bookings').send({
    listingId: listing.body._id,
    startDate: '2027-01-01',
    endDate: '2027-01-04',
  });
  return { lender, borrower, listingId: listing.body._id, bookingId: booking.body._id, booking };
}

// Advance a booking straight to a status, keeping the integrity hash valid
// (used to reach post-payment states without going through Khalti).
async function forceStatus(id, status) {
  const Booking = require('../src/models/booking.model');
  const { computeIntegrityHash } = require('../src/utils/bookingIntegrity');
  const b = await Booking.findById(id);
  b.status = status;
  b.integrityHash = computeIntegrityHash(b);
  await b.save();
}

test('creating a booking derives ids/amounts server-side and starts as requested', async () => {
  const { booking } = await scenario();
  assert.equal(booking.status, 201);
  assert.equal(booking.body.status, 'requested');
  assert.equal(booking.body.feeTotal, 300); // 100/day * 3 days
  assert.equal(booking.body.depositAmount, 2000);
});

test('a freshly created booking passes its integrity check on read (regression)', async () => {
  // The hash is sealed after save so createdAt (a hashed field) is populated;
  // hashing before save would brick every new booking with a 409 on read.
  const { borrower, bookingId } = await scenario();
  const res = await borrower.get(`/api/bookings/${bookingId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'requested');
});

test('a user cannot book their own listing', async () => {
  const lender = await makeUser('self@example.com');
  const listing = await lender.post('/api/listings').send({
    title: 'Mine', category: 'tools', depositAmount: 1000, feePerDay: 50,
  });
  const res = await lender.post('/api/bookings').send({
    listingId: listing.body._id, startDate: '2027-02-01', endDate: '2027-02-02',
  });
  assert.equal(res.status, 400);
});

test('only the lender can approve, and only from requested', async () => {
  const { lender, borrower, bookingId } = await scenario();
  // Borrower cannot approve.
  assert.equal(
    (await borrower.patch(`/api/bookings/${bookingId}/status`).send({ action: 'approve' })).status,
    403
  );
  // Lender approves.
  assert.equal(
    (await lender.patch(`/api/bookings/${bookingId}/status`).send({ action: 'approve' })).status,
    200
  );
  // Approving again is an illegal transition.
  assert.equal(
    (await lender.patch(`/api/bookings/${bookingId}/status`).send({ action: 'approve' })).status,
    409
  );
});

test('out-of-order transitions are rejected (409)', async () => {
  const { lender, bookingId } = await scenario();
  // requested -> active (handover) skips approval + payment.
  const res = await lender.patch(`/api/bookings/${bookingId}/status`).send({ action: 'handover' });
  assert.equal(res.status, 409);
});

test('the full legal lifecycle works with correct roles', async () => {
  const { lender, borrower, bookingId } = await scenario();
  await lender.patch(`/api/bookings/${bookingId}/status`).send({ action: 'approve' });
  await forceStatus(bookingId, 'paid'); // payment is applied by Khalti verification, not here

  assert.equal((await lender.patch(`/api/bookings/${bookingId}/status`).send({ action: 'handover' })).status, 200);
  // Lender cannot confirm the return — that's the borrower's action.
  assert.equal((await lender.patch(`/api/bookings/${bookingId}/status`).send({ action: 'return' })).status, 403);
  assert.equal((await borrower.patch(`/api/bookings/${bookingId}/status`).send({ action: 'return' })).status, 200);
  assert.equal((await lender.patch(`/api/bookings/${bookingId}/status`).send({ action: 'complete' })).status, 200);
  // Terminal — no further transitions.
  assert.equal((await lender.patch(`/api/bookings/${bookingId}/status`).send({ action: 'dispute' })).status, 409);
});

test('a non-participant cannot view a booking (IDOR guard)', async () => {
  const { bookingId } = await scenario();
  const outsider = await makeUser('outsider@example.com');
  assert.equal((await outsider.get(`/api/bookings/${bookingId}`)).status, 403);
});

test('a tampered booking record is caught by the integrity check', async () => {
  const { lender, bookingId } = await scenario();
  // Direct DB write that bypasses the app (no hash recompute).
  const Booking = require('../src/models/booking.model');
  await Booking.updateOne({ _id: bookingId }, { status: 'completed' });

  const res = await lender.get(`/api/bookings/${bookingId}`);
  assert.equal(res.status, 409);
  const SecurityAlert = require('../src/models/securityAlert.model');
  assert.ok(await SecurityAlert.findOne({ type: 'integrity_mismatch' }));
});

test('only participants can comment on a booking', async () => {
  const { borrower, bookingId } = await scenario();
  const outsider = await makeUser('nope@example.com');
  assert.equal((await outsider.post(`/api/bookings/${bookingId}/comments`).send({ body: 'hi' })).status, 403);
  assert.equal((await borrower.post(`/api/bookings/${bookingId}/comments`).send({ body: 'When can I collect?' })).status, 201);
});
