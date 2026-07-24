// In-app notifications: created by booking events, honour the inApp
// preference, and are strictly scoped to their owner.
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
const Notification = () => require('../src/models/notification.model');

async function makeUser(email) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: email, email, password: STRONG_PASSWORD });
  await User().updateOne({ email }, { emailVerified: true });
  await agent.post('/api/auth/login').send({ email, password: STRONG_PASSWORD });
  return agent;
}

// Lender lists an item, borrower requests it -> lender gets a notification.
async function bookingScenario(lenderEmail, borrowerEmail) {
  const lender = await makeUser(lenderEmail);
  const borrower = await makeUser(borrowerEmail);
  const listing = await lender.post('/api/listings').send({
    title: 'Drill', category: 'Power Tools', depositAmount: 2000, feePerDay: 100,
  });
  const booking = await borrower.post('/api/bookings').send({
    listingId: listing.body._id, startDate: '2027-05-01', endDate: '2027-05-03',
  });
  return { lender, borrower, bookingId: booking.body._id };
}

test('notifications require authentication', async () => {
  assert.equal((await request(app).get('/api/notifications')).status, 401);
});

test('a booking request creates an in-app notification for the lender', async () => {
  const { lender, bookingId } = await bookingScenario('l1@ex.com', 'b1@ex.com');

  const res = await lender.get('/api/notifications');
  assert.equal(res.status, 200);
  assert.equal(res.body.unread, 1);
  assert.equal(res.body.items.length, 1);
  assert.equal(res.body.items[0].link, `/bookings/${bookingId}`);
  assert.equal(res.body.items[0].read, false);
});

test('the borrower is notified when the lender approves', async () => {
  const { lender, borrower, bookingId } = await bookingScenario('l2@ex.com', 'b2@ex.com');
  await lender.patch(`/api/bookings/${bookingId}/status`).send({ action: 'approve' });

  const res = await borrower.get('/api/notifications');
  assert.equal(res.body.unread, 1);
  assert.match(res.body.items[0].message, /approved/i);
});

test('inApp=false suppresses in-app notifications', async () => {
  const lender = await makeUser('l3@ex.com');
  await lender.patch('/api/users/me').send({ notificationPrefs: { inApp: false } });
  const borrower = await makeUser('b3@ex.com');
  const listing = await lender.post('/api/listings').send({
    title: 'Saw', category: 'Power Tools', depositAmount: 100, feePerDay: 10,
  });
  await borrower.post('/api/bookings').send({
    listingId: listing.body._id, startDate: '2027-06-01', endDate: '2027-06-02',
  });

  assert.equal((await lender.get('/api/notifications')).body.items.length, 0);
});

test('marking read works, and only for your own notifications', async () => {
  const { lender } = await bookingScenario('l4@ex.com', 'b4@ex.com');
  const outsider = await makeUser('out@ex.com');

  const id = (await lender.get('/api/notifications')).body.items[0]._id;

  // Another user cannot mark it read.
  assert.equal((await outsider.patch(`/api/notifications/${id}/read`)).status, 404);
  assert.equal((await Notification().findById(id)).read, false);

  // The owner can.
  assert.equal((await lender.patch(`/api/notifications/${id}/read`)).status, 200);
  assert.equal((await lender.get('/api/notifications/unread-count')).body.unread, 0);
});

test('read-all clears the unread count', async () => {
  const { lender, bookingId } = await bookingScenario('l5@ex.com', 'b5@ex.com');
  await lender.patch(`/api/bookings/${bookingId}/status`).send({ action: 'approve' });

  assert.equal((await lender.patch('/api/notifications/read-all')).status, 200);
  assert.equal((await lender.get('/api/notifications/unread-count')).body.unread, 0);
});
