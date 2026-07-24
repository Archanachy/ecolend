// Review tests: only a participant of a completed booking may review, each
// participant may review once (both sides can review each other), and the
// comment is stored verbatim (React escapes on render — the stored-XSS
// defence).
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

async function forceStatus(id, status) {
  const Booking = require('../src/models/booking.model');
  const { computeIntegrityHash } = require('../src/utils/bookingIntegrity');
  const b = await Booking.findById(id);
  b.status = status;
  b.integrityHash = computeIntegrityHash(b);
  await b.save();
}

async function completedBooking() {
  const lender = await makeUser(`lender${Math.random()}@ex.com`);
  const borrower = await makeUser(`borrower${Math.random()}@ex.com`);
  const listing = await lender.post('/api/listings').send({ title: 'Saw', category: 'tools', depositAmount: 500, feePerDay: 50 });
  const booking = await borrower.post('/api/bookings').send({ listingId: listing.body._id, startDate: '2027-05-01', endDate: '2027-05-02' });
  const id = booking.body._id;
  await lender.patch(`/api/bookings/${id}/status`).send({ action: 'approve' });
  await forceStatus(id, 'paid');
  await lender.patch(`/api/bookings/${id}/status`).send({ action: 'handover' });
  await borrower.patch(`/api/bookings/${id}/status`).send({ action: 'return' });
  await lender.patch(`/api/bookings/${id}/status`).send({ action: 'complete' });
  return { lender, borrower, id };
}

test('a participant can review a completed booking, once', async () => {
  const { borrower, id } = await completedBooking();
  const first = await borrower.post('/api/reviews').send({ bookingId: id, rating: 5, comment: 'Great lender' });
  assert.equal(first.status, 201);
  // The SAME author cannot review twice.
  const second = await borrower.post('/api/reviews').send({ bookingId: id, rating: 4, comment: 'again' });
  assert.equal(second.status, 409);
});

// Regression: the unique index used to be on bookingId alone, so whoever
// reviewed first permanently locked the counterparty out with a 409.
test('both parties can review each other on the same booking', async () => {
  const { borrower, lender, id } = await completedBooking();

  const borrowerReview = await borrower.post('/api/reviews').send({ bookingId: id, rating: 5, comment: 'Great lender' });
  assert.equal(borrowerReview.status, 201);

  const lenderReview = await lender.post('/api/reviews').send({ bookingId: id, rating: 4, comment: 'Careful borrower' });
  assert.equal(lenderReview.status, 201, 'the lender must not be blocked by the borrower having reviewed first');

  // Each review targets the OTHER party.
  assert.notEqual(String(borrowerReview.body.targetUserId), String(lenderReview.body.targetUserId));

  const both = await request(app).get(`/api/reviews?bookingId=${id}`);
  assert.equal(both.status, 200);
  assert.equal(both.body.length, 2);
});

test('you cannot review a booking that is not completed', async () => {
  const lender = await makeUser('l@ex.com');
  const borrower = await makeUser('b@ex.com');
  const listing = await lender.post('/api/listings').send({ title: 'X', category: 'tools', depositAmount: 100, feePerDay: 10 });
  const booking = await borrower.post('/api/bookings').send({ listingId: listing.body._id, startDate: '2027-06-01', endDate: '2027-06-02' });
  const res = await borrower.post('/api/reviews').send({ bookingId: booking.body._id, rating: 5 });
  assert.equal(res.status, 400);
});

test('a non-participant cannot review', async () => {
  const { id } = await completedBooking();
  const outsider = await makeUser('outsider@ex.com');
  const res = await outsider.post('/api/reviews').send({ bookingId: id, rating: 1, comment: 'bad' });
  assert.equal(res.status, 403);
});

test('reviews can be listed for a target user, and store the comment verbatim', async () => {
  const { borrower, lender, id } = await completedBooking();
  const xss = '<script>alert(1)</script>';
  await borrower.post('/api/reviews').send({ bookingId: id, rating: 5, comment: xss });
  const User = require('../src/models/user.model');
  const lenderDoc = await User.findOne({ email: (await lender.get('/api/users/me')).body.email });
  const res = await request(app).get(`/api/reviews?userId=${lenderDoc._id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 1);
  // Stored as-is; the frontend escapes it (no dangerouslySetInnerHTML anywhere).
  assert.equal(res.body[0].comment, xss);
});
