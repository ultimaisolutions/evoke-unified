"""
Configuration for Python workers
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/ad_analyzer')

# Redis
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')

# Hume AI
HUME_API_KEY = os.getenv('HUME_API_KEY', '')
USE_MOCK_EMOTIONS = os.getenv('USE_MOCK_EMOTIONS', 'false').lower() == 'true'

# Worker Configuration
WORKER_PROCESSES = int(os.getenv('WORKER_PROCESSES', '4'))
FRAME_SAMPLE_RATE = int(os.getenv('FRAME_SAMPLE_RATE', '2'))  # frames per second

# YOLO Configuration
YOLO_CONFIDENCE_THRESHOLD = float(os.getenv('YOLO_CONFIDENCE_THRESHOLD', '0.25'))
YOLO_MODEL_SIZE = os.getenv('YOLO_MODEL_SIZE', 'yolov5m')

# Paths
BASE_DIR = Path(__file__).parent.parent.parent
UPLOAD_DIR = Path(os.getenv('UPLOAD_DIR', BASE_DIR / 'uploads'))
ADS_DIR = UPLOAD_DIR / 'ads'
REACTIONS_DIR = UPLOAD_DIR / 'reactions'
EXPORTS_DIR = UPLOAD_DIR / 'exports'

# Redis Queue Names
QUEUE_AD_ANALYSIS = 'ad_analysis'
QUEUE_EMOTION_ANALYSIS = 'emotion_analysis'

# Job Progress Channels
CHANNEL_JOB_PROGRESS = 'job:progress:{job_id}'
CHANNEL_JOB_COMPLETED = 'job:completed:{job_id}'
CHANNEL_JOB_ERROR = 'job:error:{job_id}'

def get_redis_connection():
    """Create Redis connection from URL"""
    import redis
    return redis.from_url(REDIS_URL)

def get_db_connection():
    """Create PostgreSQL connection"""
    import psycopg2
    return psycopg2.connect(DATABASE_URL)
