const { Server } = require('socket.io');
const config = require('../config');

/**
 * Socket.io service for real-time communication
 */
class SocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map(); // socketId -> client info
  }

  /**
   * Initialize Socket.io with HTTP server
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: config.frontendUrl,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupEventHandlers();
    return this.io;
  }

  /**
   * Setup Socket.io event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, {
        connectedAt: new Date(),
        subscriptions: new Set(),
      });

      // Subscribe to job progress updates
      socket.on('subscribe:job', (jobId) => {
        socket.join(`job:${jobId}`);
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.subscriptions.add(`job:${jobId}`);
        }
        console.log(`Client ${socket.id} subscribed to job:${jobId}`);
      });

      // Unsubscribe from job
      socket.on('unsubscribe:job', (jobId) => {
        socket.leave(`job:${jobId}`);
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.subscriptions.delete(`job:${jobId}`);
        }
        console.log(`Client ${socket.id} unsubscribed from job:${jobId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  /**
   * Emit progress update for a job
   */
  emitProgress(jobId, progress, step) {
    if (this.io) {
      this.io.to(`job:${jobId}`).emit('job:progress', {
        jobId,
        progress,
        step,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Emit job completion
   */
  emitCompleted(jobId, result) {
    if (this.io) {
      this.io.to(`job:${jobId}`).emit('job:completed', {
        jobId,
        result,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Emit job error
   */
  emitError(jobId, error) {
    if (this.io) {
      this.io.to(`job:${jobId}`).emit('job:error', {
        jobId,
        error: error.message || error,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get connected client count
   */
  getClientCount() {
    return this.connectedClients.size;
  }

  /**
   * Get Socket.io instance
   */
  getIO() {
    return this.io;
  }
}

module.exports = new SocketService();
