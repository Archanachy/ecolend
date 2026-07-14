(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();           // session store + models share this
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);
  const request = require('supertest');
  const app = require('./src/app');

  const pw = 'Str0ng-Passw0rd!';
  await request(app).post('/api/auth/register').send({ name:'A', email:'a@b.com', password: pw });

  // wrong password
  let r = await request(app).post('/api/auth/login').send({ email:'a@b.com', password:'wrong-Passw0rd!' });
  console.log('login wrong pw:', r.status, JSON.stringify(r.body));

  // correct password
  r = await request(app).post('/api/auth/login').send({ email:'a@b.com', password: pw });
  console.log('login correct :', r.status, JSON.stringify(r.body));
  const setCookie = (r.headers['set-cookie'] || [])[0] || '';
  console.log('Set-Cookie:', setCookie.split(';').map(s=>s.trim()).join(' | '));
  console.log('HttpOnly present :', /HttpOnly/i.test(setCookie));
  console.log('SameSite=Strict  :', /SameSite=Strict/i.test(setCookie));
  console.log('Secure absent(dev):', !/Secure/i.test(setCookie));

  // login for unknown email -> same generic 401
  r = await request(app).post('/api/auth/login').send({ email:'nobody@b.com', password: pw });
  console.log('login unknown  :', r.status, JSON.stringify(r.body));

  await mongoose.disconnect(); await mem.stop();
})().catch(e => { console.error('ERR', e); process.exit(1); });
