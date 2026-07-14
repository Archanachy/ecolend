// Loads environment variables once and exposes them as a typed config object.
// Never hardcode secrets or URLs elsewhere — read them from here.
require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ecolend',
  sessionSecret: process.env.SESSION_SECRET || 'dev-insecure-session-secret',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
};

env.isProd = env.nodeEnv === 'production';

module.exports = env;
