// MongoDB connection via Mongoose. Called once at server startup.
const mongoose = require('mongoose');
const env = require('./env');
const { logger } = require('../middleware/logger');

// Fail fast on unexpected query shapes rather than silently ignoring them.
mongoose.set('strictQuery', true);

async function connectDb() {
  await mongoose.connect(env.mongoUri);
  logger.info('db_connected');
  return mongoose.connection;
}

module.exports = { connectDb };
