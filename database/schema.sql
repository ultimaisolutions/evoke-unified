-- Ad Effectiveness Analyzer Database Schema
-- PostgreSQL 15

-- Settings table for API keys and configuration
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ads table (images and videos)
CREATE TABLE ads (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('image', 'video')),
    mime_type VARCHAR(100),
    file_size_bytes INTEGER,
    duration_seconds FLOAT,
    width INTEGER,
    height INTEGER,
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'queued', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad analysis results
CREATE TABLE ad_analyses (
    id SERIAL PRIMARY KEY,
    ad_id INTEGER REFERENCES ads(id) ON DELETE CASCADE,

    -- Overall scores (1-100)
    overall_score FLOAT,
    visual_appeal_score FLOAT,
    clarity_score FLOAT,
    attention_grab_score FLOAT,

    -- YOLO detection results
    detected_objects JSONB DEFAULT '[]',
    -- Example: [{"class": "person", "confidence": 0.95, "bbox": [x,y,w,h], "frame": 0}]

    person_count INTEGER DEFAULT 0,
    face_count INTEGER DEFAULT 0,
    text_detected BOOLEAN DEFAULT false,
    brand_elements JSONB DEFAULT '[]',

    -- Visual features (OpenCV analysis)
    dominant_colors JSONB DEFAULT '[]',
    -- Example: [{"rgb": [255, 128, 0], "percentage": 0.35, "name": "orange"}]

    brightness_avg FLOAT,
    contrast_avg FLOAT,
    saturation_avg FLOAT,
    motion_score FLOAT, -- For videos: amount of movement
    scene_changes INTEGER, -- For videos: number of cuts

    -- Composition analysis
    rule_of_thirds_score FLOAT,
    visual_balance_score FLOAT,
    focal_points JSONB DEFAULT '[]',

    -- AI-generated suggestions
    improvement_suggestions JSONB DEFAULT '[]',
    -- Example: [{"category": "lighting", "suggestion": "Increase brightness...", "priority": "high"}]

    -- Raw data for debugging
    raw_yolo_output JSONB,
    raw_opencv_output JSONB,

    processing_time_seconds FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reaction videos (people watching ads)
CREATE TABLE reaction_videos (
    id SERIAL PRIMARY KEY,
    ad_id INTEGER REFERENCES ads(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    duration_seconds FLOAT,
    fps FLOAT,
    frame_count INTEGER,
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'queued', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Frame-by-frame emotion analysis
CREATE TABLE emotion_frames (
    id SERIAL PRIMARY KEY,
    reaction_video_id INTEGER REFERENCES reaction_videos(id) ON DELETE CASCADE,
    frame_number INTEGER NOT NULL,
    timestamp_seconds FLOAT NOT NULL,

    -- Face detection
    face_detected BOOLEAN DEFAULT false,
    face_bbox JSONB, -- {"x": 0, "y": 0, "width": 100, "height": 100}
    face_confidence FLOAT,

    -- Emotion scores (0.0 - 1.0) from Hume AI
    joy FLOAT DEFAULT 0,
    surprise FLOAT DEFAULT 0,
    sadness FLOAT DEFAULT 0,
    anger FLOAT DEFAULT 0,
    fear FLOAT DEFAULT 0,
    disgust FLOAT DEFAULT 0,
    contempt FLOAT DEFAULT 0,
    interest FLOAT DEFAULT 0,
    confusion FLOAT DEFAULT 0,

    -- Derived metrics
    dominant_emotion VARCHAR(50),
    emotional_intensity FLOAT, -- Overall emotional response strength
    engagement_level FLOAT, -- Calculated engagement metric

    -- Raw API response
    raw_hume_response JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(reaction_video_id, frame_number)
);

-- Aggregated emotion analysis per reaction video
CREATE TABLE emotion_summaries (
    id SERIAL PRIMARY KEY,
    reaction_video_id INTEGER REFERENCES reaction_videos(id) ON DELETE CASCADE UNIQUE,

    -- Emotion averages over entire video
    avg_joy FLOAT,
    avg_surprise FLOAT,
    avg_sadness FLOAT,
    avg_anger FLOAT,
    avg_fear FLOAT,
    avg_disgust FLOAT,
    avg_contempt FLOAT,
    avg_interest FLOAT,
    avg_confusion FLOAT,

    -- Peak emotions (highest points)
    peak_joy_timestamp FLOAT,
    peak_surprise_timestamp FLOAT,
    peak_interest_timestamp FLOAT,

    -- Engagement metrics
    avg_engagement FLOAT,
    peak_engagement FLOAT,
    engagement_trend VARCHAR(50), -- 'increasing', 'decreasing', 'stable', 'variable'

    -- Overall emotional profile
    dominant_emotion VARCHAR(50),
    emotional_valence FLOAT, -- -1 (negative) to 1 (positive)
    emotional_arousal FLOAT, -- 0 (calm) to 1 (excited)

    -- Timeline data (for charting)
    emotion_timeline JSONB, -- Sampled every second: [{t: 0, joy: 0.5, ...}, ...]

    frames_analyzed INTEGER,
    frames_with_faces INTEGER,
    processing_time_seconds FLOAT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training data entries (for JSONL export)
CREATE TABLE training_entries (
    id SERIAL PRIMARY KEY,
    ad_id INTEGER REFERENCES ads(id) ON DELETE CASCADE,
    reaction_video_id INTEGER REFERENCES reaction_videos(id) ON DELETE SET NULL,

    -- Multi-dimensional user ratings (1-10 scale)
    engagement_rating INTEGER CHECK (engagement_rating BETWEEN 1 AND 10),
    emotional_impact_rating INTEGER CHECK (emotional_impact_rating BETWEEN 1 AND 10),
    memorability_rating INTEGER CHECK (memorability_rating BETWEEN 1 AND 10),
    clarity_rating INTEGER CHECK (clarity_rating BETWEEN 1 AND 10),
    purchase_intent_rating INTEGER CHECK (purchase_intent_rating BETWEEN 1 AND 10),
    overall_effectiveness_rating INTEGER CHECK (overall_effectiveness_rating BETWEEN 1 AND 10),

    -- Free-text feedback
    feedback_positive TEXT,
    feedback_negative TEXT,
    feedback_suggestions TEXT,

    -- Snapshot of analysis data at time of rating (for training data consistency)
    ad_features_snapshot JSONB,
    emotion_summary_snapshot JSONB,

    -- Export tracking
    exported_to_jsonl BOOLEAN DEFAULT false,
    export_timestamp TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Background job tracking
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(100) UNIQUE, -- External job ID from Bull/RQ
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('ad_analysis', 'emotion_analysis', 'jsonl_export')),
    reference_type VARCHAR(50), -- 'ad' or 'reaction_video'
    reference_id INTEGER,

    status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    current_step VARCHAR(255),

    error_message TEXT,
    error_stack TEXT,

    worker_id VARCHAR(100),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_ads_status ON ads(status);
CREATE INDEX idx_ad_analyses_ad_id ON ad_analyses(ad_id);
CREATE INDEX idx_reaction_videos_ad_id ON reaction_videos(ad_id);
CREATE INDEX idx_reaction_videos_status ON reaction_videos(status);
CREATE INDEX idx_emotion_frames_video_id ON emotion_frames(reaction_video_id);
CREATE INDEX idx_emotion_frames_timestamp ON emotion_frames(reaction_video_id, timestamp_seconds);
CREATE INDEX idx_training_entries_exported ON training_entries(exported_to_jsonl);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_reference ON jobs(reference_type, reference_id);
CREATE INDEX idx_jobs_job_id ON jobs(job_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON ads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reaction_videos_updated_at BEFORE UPDATE ON reaction_videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_entries_updated_at BEFORE UPDATE ON training_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
