// HTTP server entry point. Kept separate from app.js so the Express app can be
// imported directly in tests without opening a port.
const app = require('./app');
const env = require('./config/env');
const { logger } = require('./middleware/logger');

app.listen(env.port, () => {
  logger.info('server_started', { port: env.port, env: env.nodeEnv });
});
