# Ad Effectiveness Analyzer - Claude Code Implementation Prompt

## Project Overview

Build a demo application for **Ultim AI Services & Solutions** that analyzes advertisement effectiveness using computer vision and emotional response analysis. The app allows users to upload ads, analyze viewer reactions, and generate training data for fine-tuning an ad-rating AI model.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vite + React + shadcn/ui)              │
│                         Port: 5173                                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │   Upload Ad   │  │     Train     │  │   Settings    │           │
│  │     Tab       │  │     Tab       │  │     Tab       │           │
│  └───────────────┘  └───────────────┘  └───────────────┘           │
│                                                                      │
│  • File upload with drag-and-drop                                   │
│  • Real-time progress via WebSocket                                 │
│  • Multi-dimensional rating forms                                   │
│  • JSONL export functionality                                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NODE.JS API SERVER (Express)                      │
│                         Port: 3001                                   │
├─────────────────────────────────────────────────────────────────────┤
│  • REST API endpoints                                                │
│  • File upload handling (multer)                                     │
│  • WebSocket server (socket.io) for progress updates                │
│  • Job queue producer (Bull)                                         │
│  • PostgreSQL connection (pg)                                        │
└─────────────────────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│      Redis      │  │   PostgreSQL    │  │  Local Storage  │
│   (Bull Queue)  │  │    Database     │  │   ./uploads/    │
│   Port: 6379    │  │   Port: 5432    │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PYTHON WORKER SERVICE                             │
│              (Multi-process, Multi-threaded)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   YOLOv5    │  │   OpenCV    │  │  Hume AI    │                 │
│  │  Detection  │  │  Processing │  │  Emotions   │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                      │
│  Worker Pool: 4 processes (configurable based on CPU cores)         │
│  Each worker: Multi-threaded frame processing                        │
│  Queue: Redis (RQ - Redis Queue)                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
- **Vite** - Build tool
- **React 18** - UI framework (JavaScript, not TypeScript)
- **shadcn/ui** - Component library
- **Tailwind CSS** - Styling
- **socket.io-client** - WebSocket for progress updates
- **react-dropzone** - File upload
- **recharts** - Data visualization for emotion timelines

### Backend (Node.js)
- **Express.js** - HTTP server
- **Socket.io** - WebSocket server
- **Bull** - Redis-based job queue
- **Multer** - File upload handling
- **pg** - PostgreSQL client
- **cors** - CORS middleware

### Backend (Python Workers)
- **RQ (Redis Queue)** - Job processing
- **YOLOv5** - Object detection
- **OpenCV (cv2)** - Video/image processing
- **Hume AI SDK** - Emotion analysis
- **psycopg2** - PostgreSQL client
- **python-multiprocessing** - Parallel processing

### Infrastructure
- **PostgreSQL 15** - Primary database
- **Redis 7** - Job queue and caching

---

## Database Schema

```sql
-- File: database/schema.sql

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
```

---

## Project Structure

```
ad-analyzer/
├── frontend/                          # Vite React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Header.jsx
│   │   │   │   └── TabContainer.jsx
│   │   │   ├── upload/
│   │   │   │   ├── FileDropzone.jsx
│   │   │   │   ├── UploadProgress.jsx
│   │   │   │   ├── AnalysisResults.jsx
│   │   │   │   └── ImprovementSuggestions.jsx
│   │   │   ├── train/
│   │   │   │   ├── AdSelector.jsx
│   │   │   │   ├── ReactionUpload.jsx
│   │   │   │   ├── EmotionTimeline.jsx
│   │   │   │   ├── RatingForm.jsx
│   │   │   │   ├── TrainingDataTable.jsx
│   │   │   │   └── JsonlExport.jsx
│   │   │   └── settings/
│   │   │       ├── ApiKeyForm.jsx
│   │   │       └── GeneralSettings.jsx
│   │   ├── pages/
│   │   │   ├── UploadPage.jsx
│   │   │   ├── TrainPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── hooks/
│   │   │   ├── useSocket.js
│   │   │   ├── useJobProgress.js
│   │   │   └── useApi.js
│   │   ├── lib/
│   │   │   ├── api.js                 # API client
│   │   │   ├── socket.js              # Socket.io client
│   │   │   └── utils.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── components.json               # shadcn/ui config
│
├── backend/                           # Node.js API server
│   ├── src/
│   │   ├── routes/
│   │   │   ├── ads.js
│   │   │   ├── reactions.js
│   │   │   ├── training.js
│   │   │   ├── jobs.js
│   │   │   └── settings.js
│   │   ├── services/
│   │   │   ├── jobQueue.js            # Bull queue management
│   │   │   ├── socketService.js       # WebSocket management
│   │   │   └── storageService.js      # File management
│   │   ├── middleware/
│   │   │   ├── upload.js              # Multer config
│   │   │   └── errorHandler.js
│   │   ├── db/
│   │   │   ├── index.js               # PostgreSQL connection
│   │   │   └── queries.js             # SQL queries
│   │   ├── config/
│   │   │   └── index.js
│   │   └── app.js
│   ├── package.json
│   └── .env.example
│
├── workers/                           # Python ML workers
│   ├── src/
│   │   ├── analyzers/
│   │   │   ├── __init__.py
│   │   │   ├── yolo_analyzer.py       # YOLOv5 object detection
│   │   │   ├── opencv_analyzer.py     # Visual feature extraction
│   │   │   ├── emotion_analyzer.py    # Hume AI integration
│   │   │   └── suggestion_engine.py   # Generate improvement suggestions
│   │   ├── tasks/
│   │   │   ├── __init__.py
│   │   │   ├── ad_analysis_task.py    # Full ad analysis pipeline
│   │   │   └── emotion_analysis_task.py # Reaction video analysis
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── video_utils.py         # Frame extraction, video info
│   │   │   ├── image_utils.py         # Image preprocessing
│   │   │   └── db_utils.py            # Database operations
│   │   ├── config.py
│   │   └── worker.py                  # RQ worker entry point
│   ├── requirements.txt
│   ├── setup.py
│   └── .env.example
│
├── database/
│   ├── schema.sql
│   ├── seed.sql                       # Initial settings
│   └── migrations/
│
├── uploads/                           # Local file storage
│   ├── ads/
│   ├── reactions/
│   └── exports/
│
├── docker-compose.yml                 # PostgreSQL + Redis
├── .env.example
├── README.md
└── Makefile                           # Common commands
```

---

## API Endpoints

### Ads API (`/api/ads`)

```
POST   /api/ads/upload              - Upload ad (image/video)
GET    /api/ads                     - List all ads with analysis status
GET    /api/ads/:id                 - Get ad details with analysis
POST   /api/ads/:id/analyze         - Trigger analysis (returns job ID)
DELETE /api/ads/:id                 - Delete ad and related data
```

### Reactions API (`/api/reactions`)

```
POST   /api/reactions/upload        - Upload reaction video (requires ad_id)
GET    /api/reactions               - List all reaction videos
GET    /api/reactions/:id           - Get reaction with emotion data
GET    /api/reactions/:id/timeline  - Get emotion timeline data (for charts)
POST   /api/reactions/:id/analyze   - Trigger emotion analysis (returns job ID)
DELETE /api/reactions/:id           - Delete reaction video
```

### Training API (`/api/training`)

```
GET    /api/training/entries        - List all training entries
POST   /api/training/entries        - Create training entry with ratings
PUT    /api/training/entries/:id    - Update training entry
DELETE /api/training/entries/:id    - Delete training entry
POST   /api/training/export         - Export to JSONL (returns download URL)
GET    /api/training/export/:id     - Download JSONL file
```

### Jobs API (`/api/jobs`)

```
GET    /api/jobs                    - List recent jobs
GET    /api/jobs/:id                - Get job status and progress
DELETE /api/jobs/:id                - Cancel job
```

### Settings API (`/api/settings`)

```
GET    /api/settings                - Get all settings (masked API keys)
PUT    /api/settings                - Update settings
POST   /api/settings/test/:service  - Test API key (hume, google, etc.)
```

---

## JSONL Export Format

The training data will be exported in OpenAI's chat fine-tuning format:

```jsonl
{"messages": [{"role": "system", "content": "You are an expert ad effectiveness analyst. Analyze the given advertisement features and emotional response data to provide a comprehensive effectiveness rating. Consider visual appeal, emotional impact, clarity, memorability, and purchase intent."}, {"role": "user", "content": "Analyze this advertisement:\n\nVISUAL FEATURES:\n- Detected objects: person (95%), product (89%), text (78%)\n- Dominant colors: #FF5733 (orange, 35%), #FFFFFF (white, 40%)\n- Brightness: 0.72, Contrast: 0.65\n- Scene changes: 5\n- Motion score: 0.8\n- Rule of thirds score: 0.85\n\nEMOTIONAL RESPONSE DATA:\n- Average emotions: joy (0.45), interest (0.62), surprise (0.23)\n- Engagement trend: increasing\n- Peak interest at: 12.5 seconds\n- Emotional valence: 0.6 (positive)\n\nProvide ratings (1-10) for: engagement, emotional_impact, memorability, clarity, purchase_intent, overall_effectiveness"}, {"role": "assistant", "content": "Based on my analysis:\n\n**Engagement: 8/10**\nThe increasing engagement trend and high interest levels (0.62) indicate strong viewer attention. Multiple scene changes (5) maintain visual interest.\n\n**Emotional Impact: 7/10**\nPositive emotional valence (0.6) with notable joy (0.45) suggests pleasant viewing experience. The surprise element (0.23) adds memorability.\n\n**Memorability: 7/10**\nStrong rule of thirds composition (0.85) and peak interest moment at 12.5s create memorable visual anchors.\n\n**Clarity: 8/10**\nHigh contrast (0.65) and clear text detection (78%) suggest the message is communicated effectively.\n\n**Purchase Intent: 6/10**\nWhile emotional response is positive, the moderate joy levels suggest room for stronger call-to-action moments.\n\n**Overall Effectiveness: 7/10**\nA well-crafted ad with strong visual composition and positive emotional response. Recommendations: strengthen the closing CTA and consider a more dramatic emotional peak."}]}
```

---

## Key Implementation Details

### 1. Multi-threaded Video Processing (Python)

```python
# workers/src/utils/video_utils.py

import cv2
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import multiprocessing as mp

class VideoProcessor:
    def __init__(self, num_workers=None):
        self.num_workers = num_workers or mp.cpu_count()
    
    def extract_frames(self, video_path, sample_rate=1):
        """Extract frames at given sample rate (frames per second)."""
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_interval = int(fps / sample_rate)
        
        frames = []
        frame_num = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_num % frame_interval == 0:
                frames.append({
                    'frame_num': frame_num,
                    'timestamp': frame_num / fps,
                    'image': frame
                })
            frame_num += 1
        
        cap.release()
        return frames
    
    def process_frames_parallel(self, frames, processor_fn, max_workers=4):
        """Process frames in parallel using thread pool."""
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            results = list(executor.map(processor_fn, frames))
        return results
```

### 2. Progress Reporting via WebSocket

```javascript
// backend/src/services/socketService.js

const { Server } = require('socket.io');

class SocketService {
    constructor(server) {
        this.io = new Server(server, {
            cors: { origin: process.env.FRONTEND_URL }
        });
        this.jobRooms = new Map(); // jobId -> Set of socket IDs
    }
    
    subscribeToJob(socket, jobId) {
        socket.join(`job:${jobId}`);
    }
    
    emitProgress(jobId, progress, step) {
        this.io.to(`job:${jobId}`).emit('job:progress', {
            jobId,
            progress,
            step,
            timestamp: Date.now()
        });
    }
    
    emitCompleted(jobId, result) {
        this.io.to(`job:${jobId}`).emit('job:completed', {
            jobId,
            result,
            timestamp: Date.now()
        });
    }
    
    emitError(jobId, error) {
        this.io.to(`job:${jobId}`).emit('job:error', {
            jobId,
            error: error.message,
            timestamp: Date.now()
        });
    }
}
```

### 3. Hume AI Integration

```python
# workers/src/analyzers/emotion_analyzer.py

from hume import HumeClient
from hume.models.config import FaceConfig
import asyncio

class EmotionAnalyzer:
    def __init__(self, api_key):
        self.client = HumeClient(api_key=api_key)
    
    async def analyze_frame(self, frame_image):
        """Analyze a single frame for facial emotions."""
        # Convert frame to bytes
        _, buffer = cv2.imencode('.jpg', frame_image)
        image_bytes = buffer.tobytes()
        
        # Call Hume API
        config = FaceConfig(identify_faces=True)
        result = await self.client.expression.analyze(
            data=image_bytes,
            configs=[config]
        )
        
        return self._parse_emotions(result)
    
    def _parse_emotions(self, result):
        """Extract emotion scores from Hume response."""
        if not result.predictions:
            return {'face_detected': False}
        
        face = result.predictions[0].models.face
        if not face.predictions:
            return {'face_detected': False}
        
        emotions = face.predictions[0].emotions
        return {
            'face_detected': True,
            'joy': emotions.get('Joy', 0),
            'surprise': emotions.get('Surprise', 0),
            'sadness': emotions.get('Sadness', 0),
            'anger': emotions.get('Anger', 0),
            'fear': emotions.get('Fear', 0),
            'disgust': emotions.get('Disgust', 0),
            'contempt': emotions.get('Contempt', 0),
            'interest': emotions.get('Interest', 0),
            'confusion': emotions.get('Confusion', 0),
        }
```

### 4. YOLOv5 Analysis

```python
# workers/src/analyzers/yolo_analyzer.py

import torch

class YoloAnalyzer:
    def __init__(self, model_size='yolov5m'):
        self.model = torch.hub.load('ultralytics/yolov5', model_size)
        self.model.conf = 0.25  # Confidence threshold
    
    def analyze_frame(self, frame):
        """Detect objects in a single frame."""
        results = self.model(frame)
        
        detections = []
        for *xyxy, conf, cls in results.xyxy[0]:
            detections.append({
                'class': self.model.names[int(cls)],
                'confidence': float(conf),
                'bbox': [float(x) for x in xyxy]
            })
        
        return detections
    
    def analyze_video(self, frames, progress_callback=None):
        """Analyze multiple frames and aggregate results."""
        all_detections = []
        unique_objects = set()
        person_frames = 0
        
        for i, frame_data in enumerate(frames):
            detections = self.analyze_frame(frame_data['image'])
            
            for det in detections:
                unique_objects.add(det['class'])
                if det['class'] == 'person':
                    person_frames += 1
            
            all_detections.append({
                'frame_num': frame_data['frame_num'],
                'timestamp': frame_data['timestamp'],
                'detections': detections
            })
            
            if progress_callback:
                progress_callback(int((i + 1) / len(frames) * 100))
        
        return {
            'frame_detections': all_detections,
            'unique_objects': list(unique_objects),
            'person_presence_ratio': person_frames / len(frames) if frames else 0
        }
```

---

## Environment Variables

```env
# .env

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/ad_analyzer
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=ad_analyzer

# Redis
REDIS_URL=redis://localhost:6379

# API Keys (stored in database settings, but can be overridden)
HUME_API_KEY=
GOOGLE_CLOUD_API_KEY=

# Server
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=500

# Worker Config
WORKER_PROCESSES=4
FRAME_SAMPLE_RATE=2  # frames per second to analyze
```

---

## Docker Compose (Development)

```yaml
# docker-compose.yml

version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}
      POSTGRES_DB: ${POSTGRES_DB:-ad_analyzer}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./database/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## Makefile Commands

```makefile
# Makefile

.PHONY: setup install dev start-db stop-db migrate seed

# Initial setup
setup: start-db install migrate seed
	@echo "Setup complete!"

# Install all dependencies
install:
	cd frontend && npm install
	cd backend && npm install
	cd workers && pip install -r requirements.txt

# Start development services
dev:
	docker-compose up -d
	cd backend && npm run dev &
	cd workers && python -m src.worker &
	cd frontend && npm run dev

# Database commands
start-db:
	docker-compose up -d postgres redis

stop-db:
	docker-compose down

migrate:
	psql $(DATABASE_URL) -f database/schema.sql

seed:
	psql $(DATABASE_URL) -f database/seed.sql

# Worker commands
worker:
	cd workers && python -m src.worker --workers 4

# Build
build:
	cd frontend && npm run build
```

---

## UI Component Guidelines

### Tab Navigation
- Use shadcn/ui `Tabs` component
- Persist active tab in URL query params
- Show notification badges for processing jobs

### Upload Tab
- Drag-and-drop zone with file type validation
- Preview uploaded media (video thumbnail or image)
- Real-time progress bar during analysis
- Results displayed as cards with scores
- Expandable sections for detailed analysis
- "Improvement Suggestions" accordion

### Train Tab
- Two-column layout: left for ad selection, right for reaction upload
- Emotion timeline chart (recharts AreaChart)
- Synchronized video playback with emotion overlay
- Rating form with sliders (1-10 scale)
- Free-text feedback textareas
- Training data table with export button
- JSONL preview modal before export

### Settings Tab
- API key inputs with show/hide toggle
- "Test Connection" buttons for each API
- General settings (sample rate, worker count)
- Storage usage indicator
- Clear cache / reset options

---

## Implementation Order

1. **Phase 1: Infrastructure** (Day 1)
   - Set up project structure
   - Configure Docker (PostgreSQL, Redis)
   - Initialize frontend with Vite + shadcn/ui
   - Create basic Node.js server with routes

2. **Phase 2: Upload Tab** (Day 2-3)
   - File upload with multer
   - Basic YOLO integration
   - OpenCV visual analysis
   - Display results

3. **Phase 3: Train Tab** (Day 4-5)
   - Reaction video upload
   - Hume AI emotion analysis
   - Emotion timeline visualization
   - Rating form and storage

4. **Phase 4: Training Data Export** (Day 6)
   - JSONL generation logic
   - Training data table
   - Export functionality

5. **Phase 5: Settings & Polish** (Day 7)
   - Settings management
   - Error handling
   - Loading states
   - Final testing

---

## Notes for Claude Code

1. **Use JavaScript, not TypeScript** for frontend (per user preference)
2. **shadcn/ui components** should be added via CLI: `npx shadcn-ui@latest add [component]`
3. **Multi-processing in Python**: Use `ProcessPoolExecutor` for CPU-bound tasks, `ThreadPoolExecutor` for I/O-bound
4. **Progress updates**: Emit via Redis pub/sub, Node.js subscribes and forwards to WebSocket
5. **Large file handling**: Stream uploads, process frames in batches
6. **Error recovery**: Jobs should be resumable if worker crashes
7. **JSONL format**: Follow OpenAI's chat fine-tuning format exactly
