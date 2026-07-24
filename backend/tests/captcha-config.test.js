// Runtime captcha configuration is served by the backend, so the frontend can
// consume the site key without baking it into its own build-time env.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { setup, teardown } = require('./helpers');

test('exposes the captcha site key from backend env', async () => {
  const { app } = await setup();
  try {
    const res = await request(app).get('/api/captcha/config');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { siteKey: 'backend-test-site-key' });
  } finally {
    await teardown();
  }
});