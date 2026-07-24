// Lifecycle integrity: records that other people depend on cannot be deleted
// or abandoned out from under them, and an inactive owner's listings stop
// being bookable.
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
const Listing = () => require('../src/models/listing.model');
const Booking = () => require('../src/models/booking.model');

async function makeUser(email, role = 'user') {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: email, email, password: STRONG_PASSWORD });
  // Role must be set BEFORE login — the session caches it at login time.
  await User().updateOne({ email }, { emailVerified: true, role });
  await agent.post('/api/auth/login').send({ email, password: STRONG_PASSWORD });
  // mfaEnabled must be set AFTER login, or login would stop at the second
  // factor and never issue a session. Admins require MFA (spec 05).
  if (role === 'admin') await User().updateOne({ email }, { mfaEnabled: true });
  return agent;
}

async function forceStatus(id, status) {
  const { computeIntegrityHash } = require('../src/utils/bookingIntegrity');
  const b = await Booking().findById(id);
  b.status = status;
  b.integrityHash = computeIntegrityHash(b);
  await b.save();
}

async function listingWithBooking(lender, borrower) {
  const listing = await lender.post('/api/listings').send({
    title: 'Ladder', category: 'Tools', depositAmount: 1000, feePerDay: 100,
  });
  const booking = await borrower.post('/api/bookings').send({
    listingId: listing.body._id, startDate: '2027-04-01', endDate: '2027-04-03',
  });
  return { listingId: listing.body._id, bookingId: booking.body._id };
}

// --------------------------------------------------------------- listings

test('a listing with a live booking cannot be deleted', async () => {
  const lender = await makeUser('ld1@ex.com');
  const borrower = await makeUser('bd1@ex.com');
  const { listingId, bookingId } = await listingWithBooking(lender, borrower);
  await forceStatus(bookingId, 'paid');

  const res = await lender.delete(`/api/listings/${listingId}`);
  assert.equal(res.status, 409);
  assert.match(res.body.error, /in progress/i);
  assert.ok(await Listing().findById(listingId), 'the listing must survive');
});

test('a listing whose bookings have all finished can be deleted', async () => {
  const lender = await makeUser('ld2@ex.com');
  const borrower = await makeUser('bd2@ex.com');
  const { listingId, bookingId } = await listingWithBooking(lender, borrower);
  await forceStatus(bookingId, 'completed');

  assert.equal((await lender.delete(`/api/listings/${listingId}`)).status, 200);
  assert.equal(await Listing().findById(listingId), null);
});

// ------------------------------------------------------- owner suspension

test('suspending a lender hides their listings, reinstating restores them', async () => {
  const admin = await makeUser('admin1@ex.com', 'admin');
  const lender = await makeUser('ls1@ex.com');
  await lender.post('/api/listings').send({
    title: 'Sander', category: 'Tools', depositAmount: 500, feePerDay: 50,
  });
  const lenderDoc = await User().findOne({ email: 'ls1@ex.com' });

  // Visible in Browse to begin with.
  assert.equal((await request(app).get('/api/listings')).body.total, 1);

  const suspended = await admin.patch(`/api/admin/users/${lenderDoc._id}/suspend`).send({ suspend: true });
  assert.equal(suspended.status, 200);
  assert.equal(suspended.body.listingsAffected, 1);
  assert.equal((await request(app).get('/api/listings')).body.total, 0, 'suspended lender must not stay bookable');

  const reinstated = await admin.patch(`/api/admin/users/${lenderDoc._id}/suspend`).send({ suspend: false });
  assert.equal(reinstated.body.listingsAffected, 1);
  assert.equal((await request(app).get('/api/listings')).body.total, 1);
});

test('reinstating does not un-pause a listing the owner paused themselves', async () => {
  const admin = await makeUser('admin2@ex.com', 'admin');
  const lender = await makeUser('ls2@ex.com');
  const own = await lender.post('/api/listings').send({
    title: 'Own', category: 'Tools', depositAmount: 100, feePerDay: 10,
  });
  await lender.post('/api/listings').send({
    title: 'Auto', category: 'Tools', depositAmount: 100, feePerDay: 10,
  });
  // The owner deliberately pauses one of them.
  await lender.patch(`/api/listings/${own.body._id}`).send({ status: 'paused' });

  const lenderDoc = await User().findOne({ email: 'ls2@ex.com' });
  await admin.patch(`/api/admin/users/${lenderDoc._id}/suspend`).send({ suspend: true });
  await admin.patch(`/api/admin/users/${lenderDoc._id}/suspend`).send({ suspend: false });

  // Only the system-hidden one comes back.
  assert.equal((await Listing().findById(own.body._id)).status, 'paused');
  assert.equal((await request(app).get('/api/listings')).body.total, 1);
});

// ---------------------------------------------------------- account delete

test('an account with a booking in progress cannot be deleted', async () => {
  const lender = await makeUser('lx1@ex.com');
  const borrower = await makeUser('bx1@ex.com');
  const { bookingId } = await listingWithBooking(lender, borrower);
  await forceStatus(bookingId, 'paid');

  // Blocked for the borrower (money outstanding)...
  const b = await borrower.post('/api/users/me/delete-request');
  assert.equal(b.status, 409);
  assert.match(b.body.error, /in progress/i);
  // ...and for the lender (item outstanding).
  assert.equal((await lender.post('/api/users/me/delete-request')).status, 409);

  assert.equal((await User().findOne({ email: 'bx1@ex.com' })).status, 'active');
});

test('deleting an account once bookings are settled also hides its listings', async () => {
  const lender = await makeUser('lx2@ex.com');
  const borrower = await makeUser('bx2@ex.com');
  const { bookingId } = await listingWithBooking(lender, borrower);
  await forceStatus(bookingId, 'completed');

  assert.equal((await lender.post('/api/users/me/delete-request')).status, 200);
  assert.equal((await User().findOne({ email: 'lx2@ex.com' })).status, 'deleted_pending');
  assert.equal((await request(app).get('/api/listings')).body.total, 0);
});
