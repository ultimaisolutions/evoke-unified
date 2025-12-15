/**
 * Database queries for the Ad Analyzer
 */

// ============ ADS QUERIES ============

const createAd = `
  INSERT INTO ads (filename, original_filename, file_path, file_type, mime_type, file_size_bytes, width, height, duration_seconds, status)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  RETURNING *
`;

const getAdById = `
  SELECT a.*,
         aa.overall_score, aa.visual_appeal_score, aa.clarity_score, aa.attention_grab_score,
         aa.detected_objects, aa.person_count, aa.face_count, aa.text_detected,
         aa.dominant_colors, aa.brightness_avg, aa.contrast_avg, aa.saturation_avg,
         aa.motion_score, aa.scene_changes, aa.rule_of_thirds_score, aa.visual_balance_score,
         aa.improvement_suggestions, aa.processing_time_seconds as analysis_processing_time
  FROM ads a
  LEFT JOIN ad_analyses aa ON a.id = aa.ad_id
  WHERE a.id = $1
`;

const getAllAds = `
  SELECT a.*,
         aa.overall_score, aa.visual_appeal_score, aa.clarity_score, aa.attention_grab_score,
         aa.processing_time_seconds as analysis_processing_time
  FROM ads a
  LEFT JOIN ad_analyses aa ON a.id = aa.ad_id
  ORDER BY a.created_at DESC
  LIMIT $1 OFFSET $2
`;

const countAds = `SELECT COUNT(*) FROM ads`;

const updateAdStatus = `
  UPDATE ads SET status = $2, error_message = $3 WHERE id = $1 RETURNING *
`;

const deleteAd = `DELETE FROM ads WHERE id = $1 RETURNING *`;

// ============ AD ANALYSES QUERIES ============

const createAdAnalysis = `
  INSERT INTO ad_analyses (
    ad_id, overall_score, visual_appeal_score, clarity_score, attention_grab_score,
    detected_objects, person_count, face_count, text_detected, brand_elements,
    dominant_colors, brightness_avg, contrast_avg, saturation_avg,
    motion_score, scene_changes, rule_of_thirds_score, visual_balance_score, focal_points,
    improvement_suggestions, raw_yolo_output, raw_opencv_output, processing_time_seconds
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
  )
  RETURNING *
`;

const getAdAnalysis = `SELECT * FROM ad_analyses WHERE ad_id = $1`;

// ============ REACTION VIDEOS QUERIES ============

const createReactionVideo = `
  INSERT INTO reaction_videos (ad_id, filename, original_filename, file_path, duration_seconds, fps, frame_count, status)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING *
`;

const getReactionById = `
  SELECT
    rv.id,
    rv.ad_id,
    rv.filename,
    rv.original_filename,
    rv.file_path,
    rv.duration_seconds,
    rv.fps,
    rv.frame_count,
    rv.status,
    rv.error_message,
    rv.created_at,
    rv.updated_at,
    es.avg_joy,
    es.avg_surprise,
    es.avg_sadness,
    es.avg_anger,
    es.avg_fear,
    es.avg_disgust,
    es.avg_contempt,
    es.avg_interest,
    es.avg_confusion,
    es.peak_joy_timestamp,
    es.peak_surprise_timestamp,
    es.peak_interest_timestamp,
    es.avg_engagement,
    es.peak_engagement,
    es.engagement_trend,
    es.dominant_emotion,
    es.emotional_valence,
    es.emotional_arousal,
    es.emotion_timeline,
    es.frames_analyzed,
    es.frames_with_faces,
    es.processing_time_seconds as emotion_processing_time
  FROM reaction_videos rv
  LEFT JOIN emotion_summaries es ON rv.id = es.reaction_video_id
  WHERE rv.id = $1
`;

const getReactionsByAdId = `
  SELECT rv.*, es.avg_engagement, es.dominant_emotion, es.emotional_valence
  FROM reaction_videos rv
  LEFT JOIN emotion_summaries es ON rv.id = es.reaction_video_id
  WHERE rv.ad_id = $1
  ORDER BY rv.created_at DESC
`;

const getAllReactions = `
  SELECT rv.*, a.original_filename as ad_filename, es.avg_engagement, es.dominant_emotion
  FROM reaction_videos rv
  LEFT JOIN ads a ON rv.ad_id = a.id
  LEFT JOIN emotion_summaries es ON rv.id = es.reaction_video_id
  ORDER BY rv.created_at DESC
  LIMIT $1 OFFSET $2
`;

const updateReactionStatus = `
  UPDATE reaction_videos SET status = $2, error_message = $3 WHERE id = $1 RETURNING *
`;

const deleteReaction = `DELETE FROM reaction_videos WHERE id = $1 RETURNING *`;

// ============ EMOTION FRAMES QUERIES ============

const createEmotionFrame = `
  INSERT INTO emotion_frames (
    reaction_video_id, frame_number, timestamp_seconds,
    face_detected, face_bbox, face_confidence,
    joy, surprise, sadness, anger, fear, disgust, contempt, interest, confusion,
    dominant_emotion, emotional_intensity, engagement_level, raw_hume_response
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
  )
  ON CONFLICT (reaction_video_id, frame_number) DO UPDATE SET
    face_detected = EXCLUDED.face_detected,
    joy = EXCLUDED.joy, surprise = EXCLUDED.surprise, sadness = EXCLUDED.sadness,
    anger = EXCLUDED.anger, fear = EXCLUDED.fear, disgust = EXCLUDED.disgust,
    contempt = EXCLUDED.contempt, interest = EXCLUDED.interest, confusion = EXCLUDED.confusion,
    dominant_emotion = EXCLUDED.dominant_emotion, emotional_intensity = EXCLUDED.emotional_intensity,
    engagement_level = EXCLUDED.engagement_level
  RETURNING *
`;

const getEmotionFrames = `
  SELECT * FROM emotion_frames WHERE reaction_video_id = $1 ORDER BY timestamp_seconds
`;

const getEmotionTimeline = `
  SELECT timestamp_seconds, joy, surprise, sadness, anger, fear, disgust, contempt, interest, confusion, engagement_level
  FROM emotion_frames
  WHERE reaction_video_id = $1 AND face_detected = true
  ORDER BY timestamp_seconds
`;

// ============ EMOTION SUMMARIES QUERIES ============

const upsertEmotionSummary = `
  INSERT INTO emotion_summaries (
    reaction_video_id,
    avg_joy, avg_surprise, avg_sadness, avg_anger, avg_fear, avg_disgust, avg_contempt, avg_interest, avg_confusion,
    peak_joy_timestamp, peak_surprise_timestamp, peak_interest_timestamp,
    avg_engagement, peak_engagement, engagement_trend,
    dominant_emotion, emotional_valence, emotional_arousal,
    emotion_timeline, frames_analyzed, frames_with_faces, processing_time_seconds
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
  )
  ON CONFLICT (reaction_video_id) DO UPDATE SET
    avg_joy = EXCLUDED.avg_joy, avg_surprise = EXCLUDED.avg_surprise, avg_sadness = EXCLUDED.avg_sadness,
    avg_anger = EXCLUDED.avg_anger, avg_fear = EXCLUDED.avg_fear, avg_disgust = EXCLUDED.avg_disgust,
    avg_contempt = EXCLUDED.avg_contempt, avg_interest = EXCLUDED.avg_interest, avg_confusion = EXCLUDED.avg_confusion,
    avg_engagement = EXCLUDED.avg_engagement, peak_engagement = EXCLUDED.peak_engagement,
    engagement_trend = EXCLUDED.engagement_trend, dominant_emotion = EXCLUDED.dominant_emotion,
    emotional_valence = EXCLUDED.emotional_valence, emotional_arousal = EXCLUDED.emotional_arousal,
    emotion_timeline = EXCLUDED.emotion_timeline, frames_analyzed = EXCLUDED.frames_analyzed,
    frames_with_faces = EXCLUDED.frames_with_faces, processing_time_seconds = EXCLUDED.processing_time_seconds
  RETURNING *
`;

// ============ TRAINING ENTRIES QUERIES ============

const createTrainingEntry = `
  INSERT INTO training_entries (
    ad_id, reaction_video_id,
    engagement_rating, emotional_impact_rating, memorability_rating,
    clarity_rating, purchase_intent_rating, overall_effectiveness_rating,
    feedback_positive, feedback_negative, feedback_suggestions,
    ad_features_snapshot, emotion_summary_snapshot
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  RETURNING *
`;

const getAllTrainingEntries = `
  SELECT te.*, a.original_filename as ad_filename, rv.original_filename as reaction_filename
  FROM training_entries te
  LEFT JOIN ads a ON te.ad_id = a.id
  LEFT JOIN reaction_videos rv ON te.reaction_video_id = rv.id
  ORDER BY te.created_at DESC
  LIMIT $1 OFFSET $2
`;

const getTrainingEntryById = `SELECT * FROM training_entries WHERE id = $1`;

const updateTrainingEntry = `
  UPDATE training_entries SET
    engagement_rating = COALESCE($2, engagement_rating),
    emotional_impact_rating = COALESCE($3, emotional_impact_rating),
    memorability_rating = COALESCE($4, memorability_rating),
    clarity_rating = COALESCE($5, clarity_rating),
    purchase_intent_rating = COALESCE($6, purchase_intent_rating),
    overall_effectiveness_rating = COALESCE($7, overall_effectiveness_rating),
    feedback_positive = COALESCE($8, feedback_positive),
    feedback_negative = COALESCE($9, feedback_negative),
    feedback_suggestions = COALESCE($10, feedback_suggestions)
  WHERE id = $1
  RETURNING *
`;

const deleteTrainingEntry = `DELETE FROM training_entries WHERE id = $1 RETURNING *`;

const getUnexportedTrainingEntries = `
  SELECT te.*, a.original_filename as ad_filename,
         aa.detected_objects, aa.dominant_colors, aa.brightness_avg, aa.contrast_avg,
         aa.motion_score, aa.scene_changes, aa.rule_of_thirds_score,
         es.avg_joy, es.avg_surprise, es.avg_interest, es.engagement_trend,
         es.peak_interest_timestamp, es.emotional_valence
  FROM training_entries te
  LEFT JOIN ads a ON te.ad_id = a.id
  LEFT JOIN ad_analyses aa ON a.id = aa.ad_id
  LEFT JOIN reaction_videos rv ON te.reaction_video_id = rv.id
  LEFT JOIN emotion_summaries es ON rv.id = es.reaction_video_id
  WHERE te.exported_to_jsonl = false
`;

const markEntriesExported = `
  UPDATE training_entries SET exported_to_jsonl = true, export_timestamp = CURRENT_TIMESTAMP
  WHERE id = ANY($1)
`;

// ============ JOBS QUERIES ============

const createJob = `
  INSERT INTO jobs (job_id, job_type, reference_type, reference_id, status)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING *
`;

const getJobById = `SELECT * FROM jobs WHERE id = $1`;
const getJobByJobId = `SELECT * FROM jobs WHERE job_id = $1`;

const updateJobProgress = `
  UPDATE jobs SET progress = $2, current_step = $3, status = 'processing', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
  WHERE job_id = $1
  RETURNING *
`;

const completeJob = `
  UPDATE jobs SET status = 'completed', progress = 100, completed_at = CURRENT_TIMESTAMP
  WHERE job_id = $1
  RETURNING *
`;

const failJob = `
  UPDATE jobs SET status = 'failed', error_message = $2, error_stack = $3, completed_at = CURRENT_TIMESTAMP
  WHERE job_id = $1
  RETURNING *
`;

const getRecentJobs = `
  SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2
`;

// ============ SETTINGS QUERIES ============

const getSetting = `SELECT * FROM settings WHERE key = $1`;
const getAllSettings = `SELECT key, CASE WHEN encrypted THEN '********' ELSE value END as value, encrypted FROM settings`;
const upsertSetting = `
  INSERT INTO settings (key, value, encrypted) VALUES ($1, $2, $3)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, encrypted = EXCLUDED.encrypted
  RETURNING *
`;

module.exports = {
  // Ads
  createAd,
  getAdById,
  getAllAds,
  countAds,
  updateAdStatus,
  deleteAd,
  // Ad Analyses
  createAdAnalysis,
  getAdAnalysis,
  // Reactions
  createReactionVideo,
  getReactionById,
  getReactionsByAdId,
  getAllReactions,
  updateReactionStatus,
  deleteReaction,
  // Emotion Frames
  createEmotionFrame,
  getEmotionFrames,
  getEmotionTimeline,
  // Emotion Summaries
  upsertEmotionSummary,
  // Training
  createTrainingEntry,
  getAllTrainingEntries,
  getTrainingEntryById,
  updateTrainingEntry,
  deleteTrainingEntry,
  getUnexportedTrainingEntries,
  markEntriesExported,
  // Jobs
  createJob,
  getJobById,
  getJobByJobId,
  updateJobProgress,
  completeJob,
  failJob,
  getRecentJobs,
  // Settings
  getSetting,
  getAllSettings,
  upsertSetting,
};
