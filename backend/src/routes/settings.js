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

      case 'openai': {
        const result = await db.query(queries.getSetting, ['openai_api_key']);
        const apiKey = result.rows[0]?.value;

        if (!apiKey) {
          return res.json({
            success: false,
            service: 'openai',
            status: 'not_configured',
            message: 'OpenAI API key not configured',
          });
        }

        // Test with OpenAI models endpoint
        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });

          if (response.ok) {
            return res.json({
              success: true,
              service: 'openai',
              status: 'configured',
              message: 'OpenAI API key is valid',
            });
          } else {
            const error = await response.json();
            return res.json({
              success: false,
              service: 'openai',
              status: 'invalid',
              message: error.error?.message || 'Invalid API key',
            });
          }
        } catch (error) {
          return res.json({
            success: false,
            service: 'openai',
            status: 'error',
            message: 'Failed to connect to OpenAI API',
          });
        }
      }

      case 'google-video': {
        const result = await db.query(queries.getSetting, ['google_video_api_key']);
        const apiKey = result.rows[0]?.value;

        if (!apiKey) {
          return res.json({
            success: false,
            service: 'google-video',
            status: 'not_configured',
            message: 'Google Video Intelligence API key not configured',
          });
        }

        // Basic validation - Google API keys are typically 39 characters
        if (apiKey.length < 30) {
          return res.json({
            success: false,
            service: 'google-video',
            status: 'invalid',
            message: 'API key appears to be invalid (too short)',
          });
        }

        // Test with Video Intelligence API discovery endpoint
        try {
          const response = await fetch(
            `https://videointelligence.googleapis.com/$discovery/rest?version=v1&key=${apiKey}`
          );

          if (response.ok) {
            return res.json({
              success: true,
              service: 'google-video',
              status: 'configured',
              message: 'Google Video Intelligence API key is valid',
            });
          } else {
            const error = await response.json();
            return res.json({
              success: false,
              service: 'google-video',
              status: 'invalid',
              message: error.error?.message || 'Invalid API key',
            });
          }
        } catch (error) {
          return res.json({
            success: false,
            service: 'google-video',
            status: 'error',
            message: 'Failed to connect to Google API',
          });
        }
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
          message: `Service '${service}' is not supported. Available: hume, openai, google-video, database, redis`,
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

/**
 * DELETE /api/settings/:key
 * Delete a specific setting (only custom API keys allowed)
 */
router.delete('/:key', async (req, res, next) => {
  try {
    const { key } = req.params;

    // Only allow deleting custom API keys for safety
    if (!key.startsWith('custom_api_key_')) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete predefined settings',
        message: 'Only custom API keys can be deleted',
      });
    }

    await db.query('DELETE FROM settings WHERE key = $1', [key]);

    res.json({
      success: true,
      message: `Deleted ${key}`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
