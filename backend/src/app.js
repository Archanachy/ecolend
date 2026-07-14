// EcoLend backend — Express app assembly.
// Security middleware and routes are wired here; the HTTP server and DB
// connection live in server.js so the app stays importable in tests.
const express = require('express');
const helmet = require('helmet');

const { requestLogger } = require('./middleware/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security headers, including a restrictive default CSP.
app.use(helmet());
app.disable('x-powered-by');
app.set('trust proxy', 1); // correct client IPs behind a reverse proxy

app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Feature routers.
app.use('/api/auth', require('./routes/auth.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
