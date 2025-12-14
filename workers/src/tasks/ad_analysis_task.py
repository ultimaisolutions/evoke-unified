"""
Ad Analysis Task
Main pipeline for analyzing uploaded advertisements
"""
import json
import time
import logging
import traceback
from pathlib import Path
from typing import Dict, Any

from ..config import get_redis_connection, FRAME_SAMPLE_RATE
from ..analyzers import YoloAnalyzer, OpenCVAnalyzer, SuggestionEngine
from ..utils.video_utils import VideoProcessor
from ..utils.image_utils import load_image, get_image_info
from ..utils import db_utils

logger = logging.getLogger(__name__)

def publish_progress(redis_conn, job_id: str, progress: int, step: str, reference_type: str = 'ad', reference_id: int = None):
    """Publish progress update via Redis pub/sub"""
    message = json.dumps({
        'progress': progress,
        'step': step,
        'referenceType': reference_type,
        'referenceId': reference_id,
    })
    redis_conn.publish(f'job:progress:{job_id}', message)

    # Also update database
    db_utils.update_job_progress(job_id, progress, step)

def publish_completed(redis_conn, job_id: str, reference_type: str = 'ad', reference_id: int = None):
    """Publish completion via Redis pub/sub"""
    message = json.dumps({
        'referenceType': reference_type,
        'referenceId': reference_id,
    })
    redis_conn.publish(f'job:completed:{job_id}', message)
    db_utils.complete_job(job_id)

def publish_error(redis_conn, job_id: str, error: str, stack: str = '', reference_type: str = 'ad', reference_id: int = None):
    """Publish error via Redis pub/sub"""
    message = json.dumps({
        'error': error,
        'stack': stack,
        'referenceType': reference_type,
        'referenceId': reference_id,
    })
    redis_conn.publish(f'job:error:{job_id}', message)
    db_utils.fail_job(job_id, error, stack)

def analyze_ad(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main entry point for ad analysis.
    Called by RQ worker when job is dequeued.

    Args:
        job_data: Dict with job_id, ad_id, file_path, file_type

    Returns:
        Analysis results dict
    """
    job_id = job_data['job_id']
    ad_id = job_data['ad_id']
    file_path = job_data['file_path']
    file_type = job_data['file_type']

    redis_conn = get_redis_connection()
    start_time = time.time()

    try:
        logger.info(f"Starting analysis for ad {ad_id}, job {job_id}")

        # Update ad status
        db_utils.update_ad_status(ad_id, 'processing')
        publish_progress(redis_conn, job_id, 5, 'Initializing analysis...', 'ad', ad_id)

        # Initialize analyzers
        yolo = YoloAnalyzer()
        opencv = OpenCVAnalyzer()
        suggestions = SuggestionEngine()

        # Check if image or video
        if file_type == 'image':
            result = analyze_image(
                file_path, ad_id, job_id, redis_conn,
                yolo, opencv, suggestions
            )
        else:
            result = analyze_video(
                file_path, ad_id, job_id, redis_conn,
                yolo, opencv, suggestions
            )

        # Add processing time
        result['processing_time_seconds'] = round(time.time() - start_time, 2)

        # Save to database
        publish_progress(redis_conn, job_id, 95, 'Saving results...', 'ad', ad_id)
        db_utils.save_ad_analysis(ad_id, result)

        # Update ad status
        db_utils.update_ad_status(ad_id, 'completed')
        publish_completed(redis_conn, job_id, 'ad', ad_id)

        logger.info(f"Analysis complete for ad {ad_id} in {result['processing_time_seconds']}s")
        return result

    except Exception as e:
        error_msg = str(e)
        error_stack = traceback.format_exc()
        logger.error(f"Analysis failed for ad {ad_id}: {error_msg}")

        db_utils.update_ad_status(ad_id, 'failed', error_msg)
        publish_error(redis_conn, job_id, error_msg, error_stack, 'ad', ad_id)

        raise

def analyze_image(
    file_path: str,
    ad_id: int,
    job_id: str,
    redis_conn,
    yolo: YoloAnalyzer,
    opencv: OpenCVAnalyzer,
    suggestions: SuggestionEngine
) -> Dict[str, Any]:
    """Analyze a single image"""
    logger.info(f"Analyzing image: {file_path}")

    # Get image info
    publish_progress(redis_conn, job_id, 10, 'Loading image...', 'ad', ad_id)
    image_info = get_image_info(file_path)
    db_utils.update_ad_dimensions(ad_id, image_info['width'], image_info['height'])

    # YOLO analysis
    publish_progress(redis_conn, job_id, 30, 'Detecting objects (YOLO)...', 'ad', ad_id)
    yolo_results = yolo.analyze_image(file_path)

    # OpenCV analysis
    publish_progress(redis_conn, job_id, 60, 'Analyzing visual features...', 'ad', ad_id)
    opencv_results = opencv.analyze_image(file_path)

    # Combine results
    combined = {**yolo_results, **opencv_results}

    # Generate suggestions
    publish_progress(redis_conn, job_id, 85, 'Generating suggestions...', 'ad', ad_id)
    combined['improvement_suggestions'] = suggestions.generate_suggestions(combined)

    # Store raw outputs
    combined['raw_yolo_output'] = yolo_results
    combined['raw_opencv_output'] = opencv_results

    return combined

def analyze_video(
    file_path: str,
    ad_id: int,
    job_id: str,
    redis_conn,
    yolo: YoloAnalyzer,
    opencv: OpenCVAnalyzer,
    suggestions: SuggestionEngine
) -> Dict[str, Any]:
    """Analyze a video"""
    logger.info(f"Analyzing video: {file_path}")

    # Initialize video processor
    processor = VideoProcessor()

    # Get video info
    publish_progress(redis_conn, job_id, 10, 'Loading video metadata...', 'ad', ad_id)
    video_info = processor.get_video_info(file_path)
    db_utils.update_ad_dimensions(
        ad_id,
        video_info['width'],
        video_info['height'],
        video_info['duration_seconds']
    )

    # Extract frames
    publish_progress(redis_conn, job_id, 15, 'Extracting frames...', 'ad', ad_id)
    frames = processor.extract_frames(file_path, sample_rate=FRAME_SAMPLE_RATE)
    logger.info(f"Extracted {len(frames)} frames")

    # YOLO analysis with progress
    def yolo_progress(pct):
        # YOLO phase: 20-50%
        progress = 20 + int(pct * 0.3)
        publish_progress(redis_conn, job_id, progress, f'Detecting objects ({pct}%)...', 'ad', ad_id)

    publish_progress(redis_conn, job_id, 20, 'Detecting objects (YOLO)...', 'ad', ad_id)
    yolo_results = yolo.analyze_video(frames, progress_callback=yolo_progress)

    # OpenCV analysis with progress
    def opencv_progress(pct):
        # OpenCV phase: 50-80%
        progress = 50 + int(pct * 0.3)
        publish_progress(redis_conn, job_id, progress, f'Analyzing visual features ({pct}%)...', 'ad', ad_id)

    publish_progress(redis_conn, job_id, 50, 'Analyzing visual features...', 'ad', ad_id)
    opencv_results = opencv.analyze_video(frames, progress_callback=opencv_progress)

    # Combine results
    combined = {**yolo_results, **opencv_results}

    # Generate suggestions
    publish_progress(redis_conn, job_id, 85, 'Generating suggestions...', 'ad', ad_id)
    combined['improvement_suggestions'] = suggestions.generate_suggestions(combined)

    # Store raw outputs (summarized for videos)
    combined['raw_yolo_output'] = {
        'total_frames': yolo_results.get('total_frames_analyzed', 0),
        'unique_objects': yolo_results.get('unique_object_classes', []),
    }
    combined['raw_opencv_output'] = {
        'frames_analyzed': opencv_results.get('frames_analyzed', 0),
        'scene_changes': opencv_results.get('scene_changes', 0),
    }

    return combined

# Worker entry point for RQ
def handle_job(job_data_str: str):
    """Handle job from Redis queue"""
    job_data = json.loads(job_data_str)
    return analyze_ad(job_data)
