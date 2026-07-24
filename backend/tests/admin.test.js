// Admin tests: role enforcement on every route, suspension revoking sessions,
// activity-log viewer, alert acknowledgement, moderation, and dispute
// resolution (disputed -> resolved only).
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
  const User = require('../src/models/user.model');
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: email, email, password: STRONG_PASSWORD });
  await User.updateOne({ email }, { emailVerified: true });
  // Role must be set BEFORE login — the session caches it at login time.
  if (role) await User.updateOne({ email }, { role });
  await agent.post('/api/auth/login').send({ email, password: STRONG_PASSWORD });
  // mfaEnabled must be set AFTER login, otherwise login would stop at the
  // second-factor step and never issue a session. Admins require MFA (spec 05).
  if (role === 'admin') await User.updateOne({ email }, { mfaEnabled: true });
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

test('admin routes reject non-admins', async () => {
  const user = await makeUser('plain@ex.com');
  assert.equal((await user.get('/api/admin/users')).status, 403);
  assert.equal((await request(app).get('/api/admin/users')).status, 401);
});

test('an admin without MFA is refused the admin console (spec: MFA mandatory for admins)', async () => {
  const User = require('../src/models/user.model');
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'a', email: 'nomfa@ex.com', password: STRONG_PASSWORD });
  await User.updateOne({ email: 'nomfa@ex.com' }, { emailVerified: true, role: 'admin' });
  await agent.post('/api/auth/login').send({ email: 'nomfa@ex.com', password: STRONG_PASSWORD });
  // Correct role, but two-factor is not enabled.
  const res = await agent.get('/api/admin/users');
  assert.equal(res.status, 403);
  assert.equal(res.body.mfaSetupRequired, true);

  // Enrolling unblocks the console.
  await User.updateOne({ email: 'nomfa@ex.com' }, { mfaEnabled: true });
  assert.equal((await agent.get('/api/admin/users')).status, 200);
});

test('an admin can see the overview and user list', async () => {
  const admin = await makeUser('admin@ex.com', 'admin');
  assert.equal((await admin.get('/api/admin/overview')).status, 200);
  const users = await admin.get('/api/admin/users');
  assert.equal(users.status, 200);
  assert.ok(Array.isArray(users.body.items));
});

test('suspending a user revokes their sessions immediately', async () => {
  const admin = await makeUser('admin@ex.com', 'admin');
  const victim = await makeUser('victim@ex.com');
  assert.equal((await victim.get('/api/auth/me')).status, 200);

  const User = require('../src/models/user.model');
  const victimDoc = await User.findOne({ email: 'victim@ex.com' });
  const res = await admin.patch(`/api/admin/users/${victimDoc._id}/suspend`).send({ suspend: true });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'suspended');

  // Their live session is gone.
  assert.equal((await victim.get('/api/auth/me')).status, 401);
});

test('booking transitions appear in the admin activity log', async () => {
  const admin = await makeUser('admin@ex.com', 'admin');
  const lender = await makeUser('l@ex.com');
  const borrower = await makeUser('b@ex.com');
  const listing = await lender.post('/api/listings').send({ title: 'Y', category: 'tools', depositAmount: 100, feePerDay: 10 });
  const booking = await borrower.post('/api/bookings').send({ listingId: listing.body._id, startDate: '2027-07-01', endDate: '2027-07-02' });
  await lender.patch(`/api/bookings/${booking.body._id}/status`).send({ action: 'approve' });

  const logs = await admin.get('/api/admin/logs?action=booking.status_change');
  assert.equal(logs.status, 200);
  assert.ok(logs.body.items.length >= 1);
});

test('an admin can acknowledge a security alert', async () => {
  const admin = await makeUser('admin@ex.com', 'admin');
  const SecurityAlert = require('../src/models/securityAlert.model');
  const alert = await SecurityAlert.create({ type: 'repeated_failed_login', detail: 'test' });
  const res = await admin.patch(`/api/admin/alerts/${alert._id}/acknowledge`);
  assert.equal(res.status, 200);
  assert.equal(res.body.acknowledged, true);
});

test('an admin can remove a listing (moderation)', async () => {
  const admin = await makeUser('admin@ex.com', 'admin');
  const lender = await makeUser('l@ex.com');
  const listing = await lender.post('/api/listings').send({ title: 'Bad', category: 'tools', depositAmount: 100, feePerDay: 10 });
  const res = await admin.patch(`/api/admin/listings/${listing.body._id}/remove`);
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'removed_by_admin');
});

test('an admin resolves a disputed booking, and only a disputed one', async () => {
  const admin = await makeUser('admin@ex.com', 'admin');
  const lender = await makeUser('l@ex.com');
  const borrower = await makeUser('b@ex.com');
  const listing = await lender.post('/api/listings').send({ title: 'Z', category: 'tools', depositAmount: 100, feePerDay: 10 });
  const booking = await borrower.post('/api/bookings').send({ listingId: listing.body._id, startDate: '2027-08-01', endDate: '2027-08-02' });
  const id = booking.body._id;
  await lender.patch(`/api/bookings/${id}/status`).send({ action: 'approve' });
  await forceStatus(id, 'paid');
  await lender.patch(`/api/bookings/${id}/status`).send({ action: 'handover' });
  await borrower.patch(`/api/bookings/${id}/status`).send({ action: 'return' });

  // Not disputed yet -> cannot resolve.
  assert.equal(
    (await admin.patch(`/api/admin/bookings/${id}/resolve`).send({ outcome: 'release_to_lender' })).status,
    409
  );

  await lender.patch(`/api/bookings/${id}/status`).send({ action: 'dispute' });
  const res = await admin.patch(`/api/admin/bookings/${id}/resolve`).send({ outcome: 'return_to_borrower' });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'resolved');
});
