const express = require('express');
const router = express.Router();
const db = require('../db');
const queries = require('../db/queries');
const jobQueue = require('../services/jobQueue');

/**
 * GET /api/jobs
 * List recent jobs
 */
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await db.query(queries.getRecentJobs, [limit, offset]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/jobs/:id
 * Get job status by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Try to find by numeric ID first, then by job_id string
    let result;
    if (/^\d+$/.test(id)) {
      result = await db.query(queries.getJobById, [id]);
    } else {
      result = await db.query(queries.getJobByJobId, [id]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Job with ID ${id} not found`,
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
 * DELETE /api/jobs/:id
 * Cancel a job
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get job
    const result = await db.query(queries.getJobByJobId, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Job with ID ${id} not found`,
      });
    }

    const job = result.rows[0];

    // Can only cancel queued or processing jobs
    if (!['queued', 'processing'].includes(job.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel',
        message: `Job is already ${job.status}`,
      });
    }

    await jobQueue.cancelJob(id);

    res.json({
      success: true,
      message: 'Job cancelled',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
