const Queue = require('bull');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const db = require('../db');
const queries = require('../db/queries');

// Create Redis clients
const redisClient = new Redis(config.redisUrl);
const redisSubscriber = new Redis(config.redisUrl);

// Create Bull queues
const adAnalysisQueue = new Queue('ad_analysis', config.redisUrl);
const emotionAnalysisQueue = new Queue('emotion_analysis', config.redisUrl);

// Socket.io instance (set by app.js)
let io = null;

/**
 * Set the Socket.io instance
 */
function setSocketIO(socketIO) {
  io = socketIO;
}

/**
 * Subscribe to Redis pub/sub for job progress updates from Python workers
 */
async function initializeProgressSubscriber() {
  // Subscribe to job progress patterns
  await redisSubscriber.psubscribe('job:*');

  redisSubscriber.on('pmessage', (pattern, channel, message) => {
    try {
      const data = JSON.parse(message);
      const [, eventType, jobId] = channel.split(':');

      // Emit to Socket.io room
      if (io) {
        io.to(`job:${jobId}`).emit(`job:${eventType}`, {
          jobId,
          ...data,
          timestamp: Date.now(),
        });
      }

      // Update job in database
      handleJobEvent(eventType, jobId, data);
    } catch (error) {
      console.error('Error processing job message:', error);
    }
  });

  console.log('Job progress subscriber initialized');
}

/**
 * Handle job events and update database
 */
async function handleJobEvent(eventType, jobId, data) {
  try {
    switch (eventType) {
      case 'progress':
        await db.query(queries.updateJobProgress, [
          jobId,
          data.progress || 0,
          data.step || '',
        ]);
        break;

      case 'completed':
        await db.query(queries.completeJob, [jobId]);
        // Update the referenced entity status
        if (data.referenceType === 'ad') {
          await db.query(queries.updateAdStatus, [data.referenceId, 'completed', null]);
        } else if (data.referenceType === 'reaction_video') {
          await db.query(queries.updateReactionStatus, [data.referenceId, 'completed', null]);
        }
        break;

      case 'error':
        await db.query(queries.failJob, [jobId, data.error, data.stack || '']);
        // Update the referenced entity status
        if (data.referenceType === 'ad') {
          await db.query(queries.updateAdStatus, [data.referenceId, 'failed', data.error]);
        } else if (data.referenceType === 'reaction_video') {
          await db.query(queries.updateReactionStatus, [data.referenceId, 'failed', data.error]);
        }
        break;
    }
  } catch (error) {
    console.error('Error handling job event:', error);
  }
}

/**
 * Create an ad analysis job
 */
async function createAdAnalysisJob(adId, filePath, fileType) {
  const jobId = uuidv4();

  // Create job record in database
  await db.query(queries.createJob, [
    jobId,
    'ad_analysis',
    'ad',
    adId,
    'queued',
  ]);

  // Update ad status
  await db.query(queries.updateAdStatus, [adId, 'queued', null]);

  // Publish job to Redis for Python worker
  await redisClient.lpush('rq:queue:ad_analysis', JSON.stringify({
    job_id: jobId,
    ad_id: adId,
    file_path: filePath,
    file_type: fileType,
  }));

  return jobId;
}

/**
 * Create an emotion analysis job
 */
async function createEmotionAnalysisJob(reactionId, filePath, adId) {
  const jobId = uuidv4();

  // Create job record in database
  await db.query(queries.createJob, [
    jobId,
    'emotion_analysis',
    'reaction_video',
    reactionId,
    'queued',
  ]);

  // Update reaction status
  await db.query(queries.updateReactionStatus, [reactionId, 'queued', null]);

  // Publish job to Redis for Python worker
  await redisClient.lpush('rq:queue:emotion_analysis', JSON.stringify({
    job_id: jobId,
    reaction_id: reactionId,
    ad_id: adId,
    file_path: filePath,
  }));

  return jobId;
}

/**
 * Get job status
 */
async function getJobStatus(jobId) {
  const result = await db.query(queries.getJobByJobId, [jobId]);
  return result.rows[0] || null;
}

/**
 * Cancel a job
 */
async function cancelJob(jobId) {
  // Note: This is a simplified implementation
  // In production, you'd need to signal the worker to stop
  await db.query(`UPDATE jobs SET status = 'cancelled' WHERE job_id = $1`, [jobId]);
  return true;
}

// Initialize subscriber when module loads
initializeProgressSubscriber().catch(console.error);

/**
 * Get Redis client for health checks
 */
function getRedisClient() {
  return redisClient;
}

module.exports = {
  setSocketIO,
  createAdAnalysisJob,
  createEmotionAnalysisJob,
  getJobStatus,
  cancelJob,
  getRedisClient,
  redisClient,
  redisSubscriber,
};
