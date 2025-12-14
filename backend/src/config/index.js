require('dotenv').config();
const path = require('path');

module.exports = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ad_analyzer',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // File uploads
  uploadDir: path.resolve(__dirname, '../../..', process.env.UPLOAD_DIR || '../uploads'),
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 500,

  // Paths
  adsDir: path.resolve(__dirname, '../../..', process.env.UPLOAD_DIR || '../uploads', 'ads'),
  reactionsDir: path.resolve(__dirname, '../../..', process.env.UPLOAD_DIR || '../uploads', 'reactions'),
  exportsDir: path.resolve(__dirname, '../../..', process.env.UPLOAD_DIR || '../uploads', 'exports'),
};
