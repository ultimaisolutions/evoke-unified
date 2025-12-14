import { io } from 'socket.io-client';

// Create socket instance
const socket = io('/', {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Connection state
let isConnected = false;

// Event handlers
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
  isConnected = true;
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
  isConnected = false;
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

/**
 * Connect to socket server
 */
export function connectSocket() {
  if (!socket.connected) {
    socket.connect();
  }
}

/**
 * Disconnect from socket server
 */
export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}

/**
 * Subscribe to job progress updates
 */
export function subscribeToJob(jobId, handlers = {}) {
  if (!socket.connected) {
    socket.connect();
  }

  // Join job room
  socket.emit('subscribe:job', jobId);

  // Set up event handlers
  const progressHandler = (data) => {
    if (data.jobId === jobId && handlers.onProgress) {
      handlers.onProgress(data);
    }
  };

  const completedHandler = (data) => {
    if (data.jobId === jobId && handlers.onCompleted) {
      handlers.onCompleted(data);
    }
  };

  const errorHandler = (data) => {
    if (data.jobId === jobId && handlers.onError) {
      handlers.onError(data);
    }
  };

  socket.on('job:progress', progressHandler);
  socket.on('job:completed', completedHandler);
  socket.on('job:error', errorHandler);

  // Return unsubscribe function
  return () => {
    socket.emit('unsubscribe:job', jobId);
    socket.off('job:progress', progressHandler);
    socket.off('job:completed', completedHandler);
    socket.off('job:error', errorHandler);
  };
}

/**
 * Check if socket is connected
 */
export function isSocketConnected() {
  return isConnected;
}

export default socket;
