// Server-side session middleware (express-session + connect-mongo). Sessions
// are stored in MongoDB so they can be revoked instantly server-side — chosen
// over stateless JWT precisely so logout/password-change/suspension can kill a
// session immediately. Cookie flags: HttpOnly + SameSite=Strict always; Secure
// in production (local http dev cannot send Secure cookies).
const session = require('express-session');
const MongoStore = require('connect-mongo');
const env = require('./env');

function sessionMiddleware() {
  return session({
    name: 'ecolend.sid',
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: env.mongoUri,
      collectionName: 'sessions',
    }),
    cookie: {
      httpOnly: true,
      secure: env.isProd,
      sameSite: 'strict',
    },
  });
}

module.exports = { sessionMiddleware };
