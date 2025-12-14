const express = require('express');
const router = express.Router();
const db = require('../db');
const queries = require('../db/queries');

/**
 * GET /api/settings
 * Get all settings (API keys are masked)
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(queries.getAllSettings);

    // Convert to object format
    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = {
        value: row.value,
        encrypted: row.encrypted,
      };
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/settings
 * Update settings
 */
router.put('/', async (req, res, next) => {
  try {
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Request body must be an object with key-value pairs',
      });
    }

    const results = [];

    for (const [key, value] of Object.entries(updates)) {
      // Determine if this should be encrypted (API keys)
      const encrypted = key.toLowerCase().includes('api_key') ||
                       key.toLowerCase().includes('apikey') ||
                       key.toLowerCase().includes('secret');

      const result = await db.query(queries.upsertSetting, [
        key,
        value,
        encrypted,
      ]);

      results.push({
        key,
        updated: true,
        encrypted,
      });
    }

    res.json({
      success: true,
      data: results,
      message: `Updated ${results.length} settings`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/settings/test/:service
 * Test API connection for a service
 */
router.post('/test/:service', async (req, res, next) => {
  try {
    const { service } = req.params;

    switch (service.toLowerCase()) {
      case 'hume': {
        // Get Hume API key from settings
        const result = await db.query(queries.getSetting, ['hume_api_key']);
        const apiKey = result.rows[0]?.value;

        if (!apiKey) {
          return res.json({
            success: false,
            service: 'hume',
            status: 'not_configured',
            message: 'Hume API key not configured',
          });
        }

        // Test Hume connection (basic validation - actual test would call their API)
        // For now, just validate the key format
        if (apiKey.length < 20) {
          return res.json({
            success: false,
            service: 'hume',
            status: 'invalid',
            message: 'Hume API key appears to be invalid',
          });
        }

        res.json({
          success: true,
          service: 'hume',
          status: 'configured',
          message: 'Hume API key is configured',
        });
        break;
      }

      case 'database': {
        // Test database connection
        await db.query('SELECT 1');
        res.json({
          success: true,
          service: 'database',
          status: 'connected',
          message: 'Database connection successful',
        });
        break;
      }

      case 'redis': {
        // Test Redis connection
        const jobQueue = require('../services/jobQueue');
        await jobQueue.redisClient.ping();
        res.json({
          success: true,
          service: 'redis',
          status: 'connected',
          message: 'Redis connection successful',
        });
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: 'Unknown service',
          message: `Service '${service}' is not supported. Available: hume, database, redis`,
        });
    }
  } catch (error) {
    res.json({
      success: false,
      service: req.params.service,
      status: 'error',
      message: error.message,
    });
  }
});

module.exports = router;
