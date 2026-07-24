// Verifies the login rate limiter actually throttles. The app skips limiters
// under NODE_ENV=test for isolation, so this file runs with NODE_ENV unset to
// exercise the real limiter config on a minimal app.
process.env.NODE_ENV = 'development';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { loginLimiter } = require('../src/middleware/rateLimiter');

function makeApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.post('/login', loginLimiter, (req, res) => res.json({ ok: true }));
  return app;
}

test('login limiter allows 10 then returns 429', async () => {
  const app = makeApp();
  const agent = request(app);
  for (let i = 0; i < 10; i += 1) {
    const res = await agent.post('/login');
    assert.equal(res.status, 200, `request ${i + 1} should pass`);
  }
  const blocked = await agent.post('/login');
  assert.equal(blocked.status, 429);
});
