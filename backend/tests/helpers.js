// Shared test harness: spins up an in-memory MongoDB, connects Mongoose, and
// loads the app after the connection URI is set so the session store and models
// all point at the same instance. Tear-down closes the session store first so
// the test process exits cleanly.
const { MongoMemoryServer } = require('mongodb-memory-server');

let mem;
let mongoose;
let app;
let closeSessionStore;

async function setup() {
  mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.NODE_ENV = 'test';

  // Require only after env is set so the modules read the right config.
  mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);
  app = require('../src/app');
  ({ closeSessionStore } = require('../src/config/session'));
  return { app, mongoose };
}

async function teardown() {
  if (closeSessionStore) await closeSessionStore();
  if (mongoose) await mongoose.disconnect();
  if (mem) await mem.stop();
}

async function clearDb() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

const STRONG_PASSWORD = 'Str0ng-Passw0rd!';

module.exports = { setup, teardown, clearDb, STRONG_PASSWORD };
