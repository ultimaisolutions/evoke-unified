"""
Database utilities for Python workers
"""
import json
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from contextlib import contextmanager
from typing import Dict, Any, Optional, List

from ..config import DATABASE_URL

@contextmanager
def get_connection():
    """Context manager for database connections"""
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def update_ad_status(ad_id: int, status: str, error_message: Optional[str] = None):
    """Update ad status in database"""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE ads SET status = %s, error_message = %s WHERE id = %s",
                (status, error_message, ad_id)
            )

def update_ad_dimensions(ad_id: int, width: int, height: int, duration: Optional[float] = None):
    """Update ad dimensions after analysis"""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE ads SET width = %s, height = %s, duration_seconds = %s WHERE id = %s",
                (width, height, duration, ad_id)
            )

def save_ad_analysis(ad_id: int, analysis: Dict[str, Any]) -> int:
    """Save ad analysis results to database"""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO ad_analyses (
                    ad_id, overall_score, visual_appeal_score, clarity_score, attention_grab_score,
                    detected_objects, person_count, face_count, text_detected, brand_elements,
                    dominant_colors, brightness_avg, contrast_avg, saturation_avg,
                    motion_score, scene_changes, rule_of_thirds_score, visual_balance_score, focal_points,
                    improvement_suggestions, raw_yolo_output, raw_opencv_output, processing_time_seconds
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (ad_id) DO UPDATE SET
                    overall_score = EXCLUDED.overall_score,
                    visual_appeal_score = EXCLUDED.visual_appeal_score,
                    clarity_score = EXCLUDED.clarity_score,
                    attention_grab_score = EXCLUDED.attention_grab_score,
                    detected_objects = EXCLUDED.detected_objects,
                    person_count = EXCLUDED.person_count,
                    face_count = EXCLUDED.face_count,
                    text_detected = EXCLUDED.text_detected,
                    dominant_colors = EXCLUDED.dominant_colors,
                    brightness_avg = EXCLUDED.brightness_avg,
                    contrast_avg = EXCLUDED.contrast_avg,
                    saturation_avg = EXCLUDED.saturation_avg,
                    motion_score = EXCLUDED.motion_score,
                    scene_changes = EXCLUDED.scene_changes,
                    rule_of_thirds_score = EXCLUDED.rule_of_thirds_score,
                    visual_balance_score = EXCLUDED.visual_balance_score,
                    improvement_suggestions = EXCLUDED.improvement_suggestions,
                    processing_time_seconds = EXCLUDED.processing_time_seconds
                RETURNING id
            """, (
                ad_id,
                analysis.get('overall_score'),
                analysis.get('visual_appeal_score'),
                analysis.get('clarity_score'),
                analysis.get('attention_grab_score'),
                Json(analysis.get('detected_objects', [])),
                analysis.get('person_count', 0),
                analysis.get('face_count', 0),
                analysis.get('text_detected', False),
                Json(analysis.get('brand_elements', [])),
                Json(analysis.get('dominant_colors', [])),
                analysis.get('brightness_avg'),
                analysis.get('contrast_avg'),
                analysis.get('saturation_avg'),
                analysis.get('motion_score'),
                analysis.get('scene_changes'),
                analysis.get('rule_of_thirds_score'),
                analysis.get('visual_balance_score'),
                Json(analysis.get('focal_points', [])),
                Json(analysis.get('improvement_suggestions', [])),
                Json(analysis.get('raw_yolo_output', {})),
                Json(analysis.get('raw_opencv_output', {})),
                analysis.get('processing_time_seconds'),
            ))
            result = cur.fetchone()
            return result[0] if result else None

def update_job_progress(job_id: str, progress: int, step: str):
    """Update job progress in database"""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE jobs
                SET progress = %s, current_step = %s, status = 'processing',
                    started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
                WHERE job_id = %s
            """, (progress, step, job_id))

def complete_job(job_id: str):
    """Mark job as completed"""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE jobs
                SET status = 'completed', progress = 100, completed_at = CURRENT_TIMESTAMP
                WHERE job_id = %s
            """, (job_id,))

def fail_job(job_id: str, error_message: str, error_stack: str = ''):
    """Mark job as failed"""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE jobs
                SET status = 'failed', error_message = %s, error_stack = %s,
                    completed_at = CURRENT_TIMESTAMP
                WHERE job_id = %s
            """, (error_message, error_stack, job_id))

def get_setting(key: str) -> Optional[str]:
    """Get a setting value from database"""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT value FROM settings WHERE key = %s", (key,))
            result = cur.fetchone()
            return result[0] if result else None
