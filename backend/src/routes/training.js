const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const db = require('../db');
const queries = require('../db/queries');
const config = require('../config');

/**
 * GET /api/training/entries
 * List all training entries
 */
router.get('/entries', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await db.query(queries.getAllTrainingEntries, [limit, offset]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/entries
 * Create a new training entry with ratings
 */
router.post('/entries', async (req, res, next) => {
  try {
    const {
      ad_id,
      reaction_video_id,
      engagement_rating,
      emotional_impact_rating,
      memorability_rating,
      clarity_rating,
      purchase_intent_rating,
      overall_effectiveness_rating,
      feedback_positive,
      feedback_negative,
      feedback_suggestions,
    } = req.body;

    // Validate required fields
    if (!ad_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing ad_id',
        message: 'ad_id is required',
      });
    }

    // Verify ad exists and get its analysis
    const adResult = await db.query(queries.getAdById, [ad_id]);
    if (adResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ad not found',
        message: `Ad with ID ${ad_id} not found`,
      });
    }

    // Get ad features snapshot
    const adFeatures = {
      detected_objects: adResult.rows[0].detected_objects,
      dominant_colors: adResult.rows[0].dominant_colors,
      brightness_avg: adResult.rows[0].brightness_avg,
      contrast_avg: adResult.rows[0].contrast_avg,
      saturation_avg: adResult.rows[0].saturation_avg,
      motion_score: adResult.rows[0].motion_score,
      scene_changes: adResult.rows[0].scene_changes,
      rule_of_thirds_score: adResult.rows[0].rule_of_thirds_score,
      overall_score: adResult.rows[0].overall_score,
    };

    // Get emotion summary snapshot if reaction video provided
    let emotionSnapshot = null;
    if (reaction_video_id) {
      const reactionResult = await db.query(queries.getReactionById, [reaction_video_id]);
      if (reactionResult.rows.length > 0) {
        const r = reactionResult.rows[0];
        emotionSnapshot = {
          avg_joy: r.avg_joy,
          avg_surprise: r.avg_surprise,
          avg_interest: r.avg_interest,
          avg_engagement: r.avg_engagement,
          engagement_trend: r.engagement_trend,
          dominant_emotion: r.dominant_emotion,
          emotional_valence: r.emotional_valence,
        };
      }
    }

    // Create training entry
    const result = await db.query(queries.createTrainingEntry, [
      ad_id,
      reaction_video_id || null,
      engagement_rating || null,
      emotional_impact_rating || null,
      memorability_rating || null,
      clarity_rating || null,
      purchase_intent_rating || null,
      overall_effectiveness_rating || null,
      feedback_positive || null,
      feedback_negative || null,
      feedback_suggestions || null,
      JSON.stringify(adFeatures),
      emotionSnapshot ? JSON.stringify(emotionSnapshot) : null,
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Training entry created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/training/entries/:id
 * Update a training entry
 */
router.put('/entries/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      engagement_rating,
      emotional_impact_rating,
      memorability_rating,
      clarity_rating,
      purchase_intent_rating,
      overall_effectiveness_rating,
      feedback_positive,
      feedback_negative,
      feedback_suggestions,
    } = req.body;

    // Check entry exists
    const existingResult = await db.query(queries.getTrainingEntryById, [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Training entry with ID ${id} not found`,
      });
    }

    const result = await db.query(queries.updateTrainingEntry, [
      id,
      engagement_rating,
      emotional_impact_rating,
      memorability_rating,
      clarity_rating,
      purchase_intent_rating,
      overall_effectiveness_rating,
      feedback_positive,
      feedback_negative,
      feedback_suggestions,
    ]);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Training entry updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/training/entries/:id
 * Delete a training entry
 */
router.delete('/entries/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(queries.deleteTrainingEntry, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Training entry with ID ${id} not found`,
      });
    }

    res.json({
      success: true,
      message: 'Training entry deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/training/export
 * Export training data to JSONL format
 */
router.post('/export', async (req, res, next) => {
  try {
    // Get all unexported entries with full data
    const result = await db.query(queries.getUnexportedTrainingEntries);
    const entries = result.rows;

    if (entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data to export',
        message: 'No unexported training entries found',
      });
    }

    // Generate JSONL content
    const jsonlLines = entries.map(entry => generateJsonlEntry(entry));
    const jsonlContent = jsonlLines.join('\n');

    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `training_data_${timestamp}.jsonl`;
    const filePath = path.join(config.exportsDir, filename);

    await fs.writeFile(filePath, jsonlContent, 'utf-8');

    // Mark entries as exported
    const entryIds = entries.map(e => e.id);
    await db.query(queries.markEntriesExported, [entryIds]);

    res.json({
      success: true,
      data: {
        filename,
        entries_exported: entries.length,
        download_url: `/api/training/export/${filename}`,
      },
      message: `Exported ${entries.length} training entries`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/training/export/:filename
 * Download an exported JSONL file
 */
router.get('/export/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename',
      });
    }

    const filePath = path.join(config.exportsDir, filename);

    // Check file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `Export file ${filename} not found`,
      });
    }

    res.download(filePath, filename);
  } catch (error) {
    next(error);
  }
});

/**
 * Generate a single JSONL entry in OpenAI chat fine-tuning format
 */
function generateJsonlEntry(entry) {
  const systemPrompt = `You are an expert ad effectiveness analyst. Analyze the given advertisement features and emotional response data to provide a comprehensive effectiveness rating. Consider visual appeal, emotional impact, clarity, memorability, and purchase intent.`;

  // Build user message with ad features and emotion data
  let userContent = `Analyze this advertisement:\n\n`;

  // Visual features
  userContent += `VISUAL FEATURES:\n`;
  if (entry.detected_objects) {
    const objects = typeof entry.detected_objects === 'string'
      ? JSON.parse(entry.detected_objects)
      : entry.detected_objects;
    if (objects.length > 0) {
      userContent += `- Detected objects: ${objects.slice(0, 5).map(o => `${o.class} (${Math.round(o.confidence * 100)}%)`).join(', ')}\n`;
    }
  }
  if (entry.dominant_colors) {
    const colors = typeof entry.dominant_colors === 'string'
      ? JSON.parse(entry.dominant_colors)
      : entry.dominant_colors;
    if (colors.length > 0) {
      userContent += `- Dominant colors: ${colors.slice(0, 3).map(c => `${c.hex} (${c.name}, ${Math.round(c.percentage * 100)}%)`).join(', ')}\n`;
    }
  }
  if (entry.brightness_avg !== null) userContent += `- Brightness: ${entry.brightness_avg?.toFixed(2) || 'N/A'}\n`;
  if (entry.contrast_avg !== null) userContent += `- Contrast: ${entry.contrast_avg?.toFixed(2) || 'N/A'}\n`;
  if (entry.scene_changes !== null) userContent += `- Scene changes: ${entry.scene_changes || 0}\n`;
  if (entry.motion_score !== null) userContent += `- Motion score: ${entry.motion_score?.toFixed(2) || 'N/A'}\n`;
  if (entry.rule_of_thirds_score !== null) userContent += `- Rule of thirds score: ${entry.rule_of_thirds_score?.toFixed(2) || 'N/A'}\n`;

  // Emotional response data (if available)
  if (entry.avg_joy !== null || entry.avg_interest !== null) {
    userContent += `\nEMOTIONAL RESPONSE DATA:\n`;
    userContent += `- Average emotions: `;
    const emotions = [];
    if (entry.avg_joy !== null) emotions.push(`joy (${entry.avg_joy?.toFixed(2)})`);
    if (entry.avg_interest !== null) emotions.push(`interest (${entry.avg_interest?.toFixed(2)})`);
    if (entry.avg_surprise !== null) emotions.push(`surprise (${entry.avg_surprise?.toFixed(2)})`);
    userContent += emotions.join(', ') + '\n';
    if (entry.engagement_trend) userContent += `- Engagement trend: ${entry.engagement_trend}\n`;
    if (entry.peak_interest_timestamp !== null) userContent += `- Peak interest at: ${entry.peak_interest_timestamp?.toFixed(1)} seconds\n`;
    if (entry.emotional_valence !== null) userContent += `- Emotional valence: ${entry.emotional_valence?.toFixed(2)} (${entry.emotional_valence > 0 ? 'positive' : 'negative'})\n`;
  }

  userContent += `\nProvide ratings (1-10) for: engagement, emotional_impact, memorability, clarity, purchase_intent, overall_effectiveness`;

  // Build assistant response with ratings and feedback
  let assistantContent = `Based on my analysis:\n\n`;

  if (entry.engagement_rating) {
    assistantContent += `**Engagement: ${entry.engagement_rating}/10**\n`;
  }
  if (entry.emotional_impact_rating) {
    assistantContent += `**Emotional Impact: ${entry.emotional_impact_rating}/10**\n`;
  }
  if (entry.memorability_rating) {
    assistantContent += `**Memorability: ${entry.memorability_rating}/10**\n`;
  }
  if (entry.clarity_rating) {
    assistantContent += `**Clarity: ${entry.clarity_rating}/10**\n`;
  }
  if (entry.purchase_intent_rating) {
    assistantContent += `**Purchase Intent: ${entry.purchase_intent_rating}/10**\n`;
  }
  if (entry.overall_effectiveness_rating) {
    assistantContent += `**Overall Effectiveness: ${entry.overall_effectiveness_rating}/10**\n`;
  }

  // Add feedback
  if (entry.feedback_positive) {
    assistantContent += `\n**Strengths:** ${entry.feedback_positive}\n`;
  }
  if (entry.feedback_negative) {
    assistantContent += `\n**Areas for Improvement:** ${entry.feedback_negative}\n`;
  }
  if (entry.feedback_suggestions) {
    assistantContent += `\n**Recommendations:** ${entry.feedback_suggestions}`;
  }

  const jsonlEntry = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
      { role: 'assistant', content: assistantContent.trim() },
    ],
  };

  return JSON.stringify(jsonlEntry);
}

module.exports = router;
