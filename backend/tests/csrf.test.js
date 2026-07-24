// Tests the double-submit CSRF middleware directly. The app skips CSRF under
// NODE_ENV=test (so the integration suite isn't blocked), so this runs it on a
// minimal app with verification enabled.
process.env.NODE_ENV = 'development';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');
const { issueCsrfToken, verifyCsrf } = require('../src/middleware/csrf');

function makeApp() {
  const app = express();
  app.use(cookieParser());
  app.use(issueCsrfToken);
  app.use(verifyCsrf);
  app.get('/token', (req, res) => res.json({ ok: true }));
  app.post('/write', (req, res) => res.json({ ok: true }));
  return app;
}

function csrfCookie(res) {
  const set = res.headers['set-cookie'] || [];
  const c = set.find((x) => x.startsWith('csrfToken='));
  return c ? c.split(';')[0].split('=')[1] : '';
}

test('safe GET issues a csrf cookie', async () => {
  const res = await request(makeApp()).get('/token');
  assert.equal(res.status, 200);
  assert.ok(csrfCookie(res));
});

test('state-changing request without a token is rejected (403)', async () => {
  const res = await request(makeApp()).post('/write').send({});
  assert.equal(res.status, 403);
});

test('state-changing request with matching cookie and header passes', async () => {
  const agent = request.agent(makeApp());
  const bootstrap = await agent.get('/token');
  const token = csrfCookie(bootstrap);
  const res = await agent.post('/write').set('X-CSRF-Token', token).send({});
  assert.equal(res.status, 200);
});

test('a mismatched header token is rejected (403)', async () => {
  const agent = request.agent(makeApp());
  await agent.get('/token');
  const res = await agent.post('/write').set('X-CSRF-Token', 'wrong-token').send({});
  assert.equal(res.status, 403);
});
