// Payment-security tests. The Khalti service is mocked so we can drive every
// verification branch: never trust the callback, verify status AND amount,
// prevent pidx reuse, guard the double-processing race, and fail closed.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { setup, teardown, clearDb, STRONG_PASSWORD } = require('./helpers');
const khalti = require('../src/services/khalti.service');

let app;

before(async () => {
  ({ app } = await setup());
});
after(teardown);
beforeEach(async () => {
  await clearDb();
  // Safe defaults so no test ever makes a real network call.
  khalti.initiate = async () => ({ pidx: `PIDX-${Math.random()}`, payment_url: 'https://pay.example' });
  khalti.lookup = async () => ({ status: 'Completed', total_amount: 0, transaction_id: 'T' });
});

async function makeUser(email) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: email, email, password: STRONG_PASSWORD });
  await require('../src/models/user.model').updateOne({ email }, { emailVerified: true });
  await agent.post('/api/auth/login').send({ email, password: STRONG_PASSWORD });
  return agent;
}

// Returns an approved booking (borrower agent + id). Fee 100/day * 3 + 2000
// deposit = NPR 2300 => 230000 paisa.
async function approvedBooking() {
  const lender = await makeUser(`lender${Math.random()}@ex.com`);
  const borrower = await makeUser(`borrower${Math.random()}@ex.com`);
  const listing = await lender.post('/api/listings').send({
    title: 'Drill', category: 'tools', depositAmount: 2000, feePerDay: 100,
  });
  const booking = await borrower.post('/api/bookings').send({
    listingId: listing.body._id, startDate: '2027-03-01', endDate: '2027-03-04',
  });
  await lender.patch(`/api/bookings/${booking.body._id}/status`).send({ action: 'approve' });
  return { borrower, id: booking.body._id, amountPaisa: 230000 };
}

const Booking = () => require('../src/models/booking.model');

test('only the borrower can pay, and only when approved', async () => {
  const { id } = await approvedBooking();
  const outsider = await makeUser('outsider@ex.com');
  assert.equal((await outsider.post(`/api/bookings/${id}/pay`)).status, 403);
});

test('initiation stores the pidx and exact paisa amount before returning the url', async () => {
  const { borrower, id, amountPaisa } = await approvedBooking();
  let sentAmount = null;
  khalti.initiate = async (payload) => {
    sentAmount = payload.amount;
    return { pidx: 'PIDX-1', payment_url: 'https://pay.example/1' };
  };
  const res = await borrower.post(`/api/bookings/${id}/pay`);
  assert.equal(res.status, 200);
  assert.equal(res.body.payment_url, 'https://pay.example/1');
  assert.equal(sentAmount, amountPaisa);

  const b = await Booking().findById(id);
  assert.equal(b.khaltiPidx, 'PIDX-1');
  assert.equal(b.khaltiAmountPaisa, amountPaisa);
});

test('re-initiation never mints a second pidx — it resumes the live one', async () => {
  const { borrower, id } = await approvedBooking();
  khalti.initiate = async () => ({ pidx: 'PIDX-FIRST', payment_url: 'https://pay/first' });
  await borrower.post(`/api/bookings/${id}/pay`);

  // Khalti says the first attempt is still open, so the borrower is sent back
  // to it rather than a second, concurrently-payable page.
  khalti.lookup = async () => ({ status: 'Pending', total_amount: 230000 });
  khalti.initiate = async () => assert.fail('must not initiate a second payment');

  const res = await borrower.post(`/api/bookings/${id}/pay`);
  assert.equal(res.status, 200);
  assert.equal(res.body.payment_url, 'https://pay/first');
  assert.equal((await Booking().findById(id)).khaltiPidx, 'PIDX-FIRST');
});

test('a forged/unverified callback never marks the booking paid (fail closed)', async () => {
  const { borrower, id } = await approvedBooking();
  await borrower.post(`/api/bookings/${id}/pay`);
  // Lookup says the user cancelled — regardless of any query params.
  khalti.lookup = async () => ({ status: 'User canceled', total_amount: 230000 });
  const res = await request(app).get(`/api/bookings/${id}/payment/callback?status=Completed&amount=230000`);
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /result=failed/);
  assert.equal((await Booking().findById(id)).status, 'approved'); // unchanged
});

test('after a cancelled payment the borrower can retry with a fresh pidx', async () => {
  const { borrower, id } = await approvedBooking();
  khalti.initiate = async () => ({ pidx: 'PIDX-A', payment_url: 'https://pay/a' });
  await borrower.post(`/api/bookings/${id}/pay`);
  // Cancelled at Khalti — callback should clear the pending pidx.
  khalti.lookup = async () => ({ status: 'User canceled', total_amount: 230000 });
  await request(app).get(`/api/bookings/${id}/payment/callback`);
  assert.equal((await Booking().findById(id)).khaltiPidx, undefined);

  // Retry now succeeds (a genuinely pending payment would still be refused).
  khalti.initiate = async () => ({ pidx: 'PIDX-B', payment_url: 'https://pay/b' });
  const retry = await borrower.post(`/api/bookings/${id}/pay`);
  assert.equal(retry.status, 200);
  assert.equal((await Booking().findById(id)).khaltiPidx, 'PIDX-B');
});

test('a genuinely pending payment keeps the pidx so it can still complete', async () => {
  const { borrower, id } = await approvedBooking();
  await borrower.post(`/api/bookings/${id}/pay`);
  khalti.lookup = async () => ({ status: 'Pending', total_amount: 230000 });
  const res = await request(app).get(`/api/bookings/${id}/payment/callback`);
  assert.match(res.headers.location, /result=pending/);
  assert.ok((await Booking().findById(id)).khaltiPidx); // pidx retained
});

// If the borrower closes the Khalti tab, return_url never fires and the pidx
// is left on the booking. These cover the recovery paths that stops it from
// becoming a permanent dead end on the next "Pay" click.
test('an abandoned-but-completed payment is settled on the next pay attempt', async () => {
  const { borrower, id } = await approvedBooking();
  await borrower.post(`/api/bookings/${id}/pay`);

  // They actually paid; only the redirect back to us was lost.
  khalti.lookup = async () => ({ status: 'Completed', total_amount: 230000, transaction_id: 'TXN-LOST' });
  const res = await borrower.post(`/api/bookings/${id}/pay`);
  assert.equal(res.status, 409);
  assert.match(res.body.error, /already paid/i);

  const b = await Booking().findById(id);
  assert.equal(b.status, 'paid');
  assert.equal(b.khaltiTransactionId, 'TXN-LOST');
  assert.ok(b.paymentVerifiedAt);
});

test('an abandoned-and-expired payment is released so a fresh one can start', async () => {
  const { borrower, id } = await approvedBooking();
  khalti.initiate = async () => ({ pidx: 'PIDX-OLD', payment_url: 'https://pay/old' });
  await borrower.post(`/api/bookings/${id}/pay`);

  khalti.lookup = async () => ({ status: 'Expired', total_amount: 230000 });
  khalti.initiate = async () => ({ pidx: 'PIDX-NEW', payment_url: 'https://pay/new' });

  const res = await borrower.post(`/api/bookings/${id}/pay`);
  assert.equal(res.status, 200);
  assert.equal(res.body.payment_url, 'https://pay/new');
  assert.equal((await Booking().findById(id)).khaltiPidx, 'PIDX-NEW');
});

test('a completed payment for the wrong amount is refused, not settled', async () => {
  const { borrower, id } = await approvedBooking();
  await borrower.post(`/api/bookings/${id}/pay`);

  // Completed at Khalti, but for less than we asked => suspected tampering.
  khalti.lookup = async () => ({ status: 'Completed', total_amount: 100, transaction_id: 'TXN-BAD' });
  const res = await borrower.post(`/api/bookings/${id}/pay`);
  assert.equal(res.status, 409);

  const b = await Booking().findById(id);
  assert.equal(b.status, 'approved'); // fail closed
  assert.equal(b.khaltiPidx, undefined); // released for a clean retry
  const alerts = await require('../src/models/securityAlert.model').find({ type: 'integrity_mismatch' });
  assert.equal(alerts.length, 1);
});

test('a verified callback (Completed + matching amount) marks the booking paid', async () => {
  const { borrower, id, amountPaisa } = await approvedBooking();
  await borrower.post(`/api/bookings/${id}/pay`);
  khalti.lookup = async () => ({ status: 'Completed', total_amount: amountPaisa, transaction_id: 'TXN-9' });
  const res = await request(app).get(`/api/bookings/${id}/payment/callback`);
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /result=success/);
  const b = await Booking().findById(id);
  assert.equal(b.status, 'paid');
  assert.equal(b.khaltiTransactionId, 'TXN-9');
  assert.ok(b.paymentVerifiedAt);
});

test('a Completed payment with the wrong amount is rejected and alerts (tampering)', async () => {
  const { borrower, id } = await approvedBooking();
  await borrower.post(`/api/bookings/${id}/pay`);
  khalti.lookup = async () => ({ status: 'Completed', total_amount: 100, transaction_id: 'X' });
  const res = await request(app).get(`/api/bookings/${id}/payment/callback`);
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /result=failed/);
  assert.equal((await Booking().findById(id)).status, 'approved'); // NOT paid
  const SecurityAlert = require('../src/models/securityAlert.model');
  assert.ok(await SecurityAlert.findOne({ type: 'integrity_mismatch' }));
});

test('firing the callback twice applies the paid transition exactly once', async () => {
  const { borrower, id, amountPaisa } = await approvedBooking();
  await borrower.post(`/api/bookings/${id}/pay`);
  khalti.lookup = async () => ({ status: 'Completed', total_amount: amountPaisa, transaction_id: 'TXN' });
  await request(app).get(`/api/bookings/${id}/payment/callback`);
  await request(app).get(`/api/bookings/${id}/payment/callback`);
  const b = await Booking().findById(id);
  assert.equal(b.status, 'paid');
  assert.equal(b.statusHistory.filter((h) => h.status === 'paid').length, 1);
});

test('the khaltiPidx unique index prevents pidx reuse across bookings', async () => {
  const mongoose = require('mongoose');
  const B = Booking();
  const base = {
    listingId: new mongoose.Types.ObjectId(),
    borrowerId: new mongoose.Types.ObjectId(),
    lenderId: new mongoose.Types.ObjectId(),
    startDate: new Date('2027-04-01'),
    endDate: new Date('2027-04-02'),
    feeTotal: 100,
    depositAmount: 500,
    khaltiPidx: 'SHARED-PIDX',
  };
  await new B(base).save();
  await assert.rejects(new B({ ...base, borrowerId: new mongoose.Types.ObjectId() }).save());
});
