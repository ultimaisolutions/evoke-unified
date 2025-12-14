const express = require('express');
const router = express.Router();
const db = require('../db');
const queries = require('../db/queries');
const { uploadAd, getFileType } = require('../middleware/upload');
const storageService = require('../services/storageService');
const jobQueue = require('../services/jobQueue');

/**
 * POST /api/ads/upload
 * Upload a new ad (image or video)
 */
router.post('/upload', uploadAd, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please provide an image or video file',
      });
    }

    const { filename, originalname, path: filePath, mimetype, size } = req.file;
    const fileType = getFileType(mimetype);

    // Create ad record in database
    const result = await db.query(queries.createAd, [
      filename,
      originalname,
      filePath,
      fileType,
      mimetype,
      size,
      null, // width - will be updated during analysis
      null, // height
      null, // duration_seconds
      'uploaded',
    ]);

    const ad = result.rows[0];

    res.status(201).json({
      success: true,
      data: ad,
      message: 'Ad uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ads
 * List all ads with optional pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const [adsResult, countResult] = await Promise.all([
      db.query(queries.getAllAds, [limit, offset]),
      db.query(queries.countAds),
    ]);

    res.json({
      success: true,
      data: adsResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ads/:id
 * Get a single ad with its analysis
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(queries.getAdById, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Ad with ID ${id} not found`,
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ads/:id/analyze
 * Trigger analysis for an ad
 */
router.post('/:id/analyze', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get ad details
    const adResult = await db.query(queries.getAdById, [id]);
    if (adResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Ad with ID ${id} not found`,
      });
    }

    const ad = adResult.rows[0];

    // Check if already processing
    if (ad.status === 'processing' || ad.status === 'queued') {
      return res.status(400).json({
        success: false,
        error: 'Already processing',
        message: 'This ad is already being analyzed',
      });
    }

    // Create analysis job
    const jobId = await jobQueue.createAdAnalysisJob(
      ad.id,
      ad.file_path,
      ad.file_type
    );

    res.json({
      success: true,
      data: {
        jobId,
        adId: ad.id,
        status: 'queued',
      },
      message: 'Analysis job created',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/ads/:id
 * Delete an ad and all related data
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get ad to find file path
    const adResult = await db.query(queries.getAdById, [id]);
    if (adResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Ad with ID ${id} not found`,
      });
    }

    const ad = adResult.rows[0];

    // Delete from database (cascades to analyses)
    await db.query(queries.deleteAd, [id]);

    // Delete file from storage
    await storageService.deleteFile(ad.file_path);

    res.json({
      success: true,
      message: 'Ad deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
