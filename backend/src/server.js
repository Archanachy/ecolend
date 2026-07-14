// HTTP server entry point. Kept separate from app.js so the Express app can be
// imported directly in tests without opening a port or a DB connection.
const app = require('./app');
const env = require('./config/env');
const { connectDb } = require('./config/db');
const { logger } = require('./middleware/logger');

async function start() {
  try {
    await connectDb();
    app.listen(env.port, () => {
      logger.info('server_started', { port: env.port, env: env.nodeEnv });
    });
  } catch (err) {
    logger.error('startup_failed', { message: err.message });
    process.exit(1);
  }
}

start();
