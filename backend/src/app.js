require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config');
const db = require('./db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const socketService = require('./services/socketService');
const jobQueue = require('./services/jobQueue');

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io through service
const io = socketService.initialize(server);

// Connect job queue to socket service
jobQueue.setSocketIO(io);

// Make io accessible to routes
app.set('io', io);
app.set('maxFileSizeMB', config.maxFileSizeMB);

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const services = {
    database: 'disconnected',
    redis: 'disconnected',
  };

  try {
    // Check database
    await db.query('SELECT 1');
    services.database = 'connected';
  } catch (error) {
    console.error('Database health check failed:', error.message);
  }

  try {
    // Check Redis via job queue
    const redis = jobQueue.getRedisClient();
    if (redis) {
      await redis.ping();
      services.redis = 'connected';
    }
  } catch (error) {
    console.error('Redis health check failed:', error.message);
  }

  const allHealthy = Object.values(services).every(s => s === 'connected');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    services,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/ads', require('./routes/ads'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/reactions', require('./routes/reactions'));
app.use('/api/training', require('./routes/training'));
app.use('/api/settings', require('./routes/settings'));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           Ad Effectiveness Analyzer - API Server               ║
╠════════════════════════════════════════════════════════════════╣
║  Status:    Running                                            ║
║  Port:      ${PORT}                                                ║
║  Mode:      ${config.nodeEnv}                                      ║
║  Frontend:  ${config.frontendUrl}                           ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
