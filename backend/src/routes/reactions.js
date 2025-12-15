const express = require('express');
const router = express.Router();
const db = require('../db');
const queries = require('../db/queries');
const { uploadReaction } = require('../middleware/upload');
const storageService = require('../services/storageService');
const jobQueue = require('../services/jobQueue');

/**
 * POST /api/reactions/upload
 * Upload a reaction video (requires ad_id)
 */
router.post('/upload', uploadReaction, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please provide a video file',
      });
    }

    const { ad_id } = req.body;
    if (!ad_id) {
      // Clean up uploaded file
      await storageService.deleteFile(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Missing ad_id',
        message: 'Please specify which ad this reaction is for',
      });
    }

    // Verify ad exists
    const adResult = await db.query(queries.getAdById, [ad_id]);
    if (adResult.rows.length === 0) {
      await storageService.deleteFile(req.file.path);
      return res.status(404).json({
        success: false,
        error: 'Ad not found',
        message: `Ad with ID ${ad_id} not found`,
      });
    }

    const { filename, originalname, path: filePath, size } = req.file;

    // Create reaction video record
    const result = await db.query(queries.createReactionVideo, [
      ad_id,
      filename,
      originalname,
      filePath,
      null, // duration_seconds - will be updated during analysis
      null, // fps
      null, // frame_count
      'uploaded',
    ]);

    const reaction = result.rows[0];

    res.status(201).json({
      success: true,
      data: reaction,
      message: 'Reaction video uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reactions
 * List all reaction videos
 */
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await db.query(queries.getAllReactions, [limit, offset]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Format reaction data with nested emotion_summary
 */
function formatReactionWithEmotionSummary(row) {
  const {
    // Reaction video fields
    id, ad_id, filename, original_filename, file_path,
    duration_seconds, fps, frame_count, status, error_message,
    created_at, updated_at,
    // Emotion summary fields (from LEFT JOIN)
    avg_joy, avg_surprise, avg_sadness, avg_anger, avg_fear,
    avg_disgust, avg_contempt, avg_interest, avg_confusion,
    peak_joy_timestamp, peak_surprise_timestamp, peak_interest_timestamp,
    avg_engagement, peak_engagement, engagement_trend,
    dominant_emotion, emotional_valence, emotional_arousal,
    emotion_timeline, frames_analyzed, frames_with_faces,
    emotion_processing_time
  } = row;

  // Build reaction object
  const reaction = {
    id, ad_id, filename, original_filename, file_path,
    duration_seconds, fps, frame_count, status, error_message,
    created_at, updated_at,
  };

  // Only include emotion_summary if we have data
  if (avg_engagement !== null || dominant_emotion !== null) {
    reaction.emotion_summary = {
      avg_joy, avg_surprise, avg_sadness, avg_anger, avg_fear,
      avg_disgust, avg_contempt, avg_interest, avg_confusion,
      peak_joy_timestamp, peak_surprise_timestamp, peak_interest_timestamp,
      avg_engagement, peak_engagement, engagement_trend,
      dominant_emotion, emotional_valence, emotional_arousal,
      emotion_timeline, frames_analyzed, frames_with_faces,
      processing_time_seconds: emotion_processing_time
    };
  }

  return reaction;
}

/**
 * GET /api/reactions/:id
 * Get a single reaction video with emotion data
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(queries.getReactionById, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Reaction video with ID ${id} not found`,
      });
    }

    const reaction = formatReactionWithEmotionSummary(result.rows[0]);

    res.json({
      success: true,
      data: reaction,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reactions/:id/timeline
 * Get emotion timeline data for charting
 */
router.get('/:id/timeline', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check reaction exists
    const reactionResult = await db.query(queries.getReactionById, [id]);
    if (reactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Reaction video with ID ${id} not found`,
      });
    }

    // Get timeline data
    const timelineResult = await db.query(queries.getEmotionTimeline, [id]);

    res.json({
      success: true,
      data: {
        reaction_id: id,
        timeline: timelineResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reactions/:id/analyze
 * Trigger emotion analysis for a reaction video
 */
router.post('/:id/analyze', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get reaction details
    const reactionResult = await db.query(queries.getReactionById, [id]);
    if (reactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Reaction video with ID ${id} not found`,
      });
    }

    const reaction = reactionResult.rows[0];

    // Check if already processing
    if (reaction.status === 'processing' || reaction.status === 'queued') {
      return res.status(400).json({
        success: false,
        error: 'Already processing',
        message: 'This reaction video is already being analyzed',
      });
    }

    // Create emotion analysis job
    const jobId = await jobQueue.createEmotionAnalysisJob(
      reaction.id,
      reaction.file_path,
      reaction.ad_id
    );

    res.json({
      success: true,
      data: {
        jobId,
        reactionId: reaction.id,
        status: 'queued',
      },
      message: 'Emotion analysis job created',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/reactions/:id
 * Delete a reaction video
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get reaction to find file path
    const reactionResult = await db.query(queries.getReactionById, [id]);
    if (reactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Reaction video with ID ${id} not found`,
      });
    }

    const reaction = reactionResult.rows[0];

    // Delete from database (cascades to emotion frames and summaries)
    await db.query(queries.deleteReaction, [id]);

    // Delete file from storage
    await storageService.deleteFile(reaction.file_path);

    res.json({
      success: true,
      message: 'Reaction video deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
