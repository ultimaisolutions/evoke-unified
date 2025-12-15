"""
Emotion Analysis Task
Analyzes reaction videos for viewer emotional responses using Hume AI
Supports both streaming (real-time) and batch API modes
"""
import json
import time
import logging
import traceback
import asyncio
import cv2
from typing import Dict, Any, Optional

from ..config import get_redis_connection, FRAME_SAMPLE_RATE, HUME_API_KEY, USE_MOCK_EMOTIONS
from ..analyzers.emotion_analyzer import EmotionAnalyzer
from ..utils.video_utils import VideoProcessor
from ..utils import db_utils

logger = logging.getLogger(__name__)

# Default to streaming mode (can be overridden by database setting)
USE_STREAMING_API = True

def publish_progress(redis_conn, job_id: str, progress: int, step: str,
                    reference_type: str = 'reaction_video', reference_id: int = None):
    """Publish progress update via Redis pub/sub"""
    message = json.dumps({
        'progress': progress,
        'step': step,
        'referenceType': reference_type,
        'referenceId': reference_id,
    })
    redis_conn.publish(f'job:progress:{job_id}', message)
    db_utils.update_job_progress(job_id, progress, step)

def publish_completed(redis_conn, job_id: str,
                     reference_type: str = 'reaction_video', reference_id: int = None):
    """Publish completion via Redis pub/sub"""
    message = json.dumps({
        'referenceType': reference_type,
        'referenceId': reference_id,
    })
    redis_conn.publish(f'job:completed:{job_id}', message)
    db_utils.complete_job(job_id)

def publish_error(redis_conn, job_id: str, error: str, stack: str = '',
                 reference_type: str = 'reaction_video', reference_id: int = None):
    """Publish error via Redis pub/sub"""
    message = json.dumps({
        'error': error,
        'stack': stack,
        'referenceType': reference_type,
        'referenceId': reference_id,
    })
    redis_conn.publish(f'job:error:{job_id}', message)
    db_utils.fail_job(job_id, error, stack)

def publish_frame_result(redis_conn, job_id: str, frame_result: Dict[str, Any],
                        reference_type: str = 'reaction_video', reference_id: int = None):
    """Publish individual frame result for real-time UI updates"""
    message = json.dumps({
        'type': 'frame_result',
        'frame': frame_result,
        'referenceType': reference_type,
        'referenceId': reference_id,
    })
    redis_conn.publish(f'job:frame:{job_id}', message)

def analyze_emotion(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main entry point for emotion analysis.
    Called by RQ worker when job is dequeued.

    Args:
        job_data: Dict with job_id, reaction_id, ad_id, file_path

    Returns:
        Emotion analysis results dict
    """
    job_id = job_data['job_id']
    reaction_id = job_data['reaction_id']
    ad_id = job_data.get('ad_id')
    file_path = job_data['file_path']

    redis_conn = get_redis_connection()
    start_time = time.time()

    try:
        logger.info(f"Starting emotion analysis for reaction {reaction_id}, job {job_id}")

        # Update status
        update_reaction_status(reaction_id, 'processing')
        publish_progress(redis_conn, job_id, 5, 'Initializing...', 'reaction_video', reaction_id)

        # Get API key
        api_key = HUME_API_KEY or db_utils.get_setting('hume_api_key')
        if not api_key:
            raise ValueError("Hume API key not configured")

        # Check mock mode - database setting takes precedence over environment variable
        db_mock_setting = db_utils.get_setting('use_mock_emotions')
        use_mock = USE_MOCK_EMOTIONS  # Default from environment
        if db_mock_setting is not None:
            use_mock = db_mock_setting.lower() == 'true'

        logger.info(f"Mock mode: {use_mock} (env: {USE_MOCK_EMOTIONS}, db: {db_mock_setting})")

        # Check streaming mode - database setting takes precedence
        db_streaming_setting = db_utils.get_setting('use_streaming_api')
        use_streaming = USE_STREAMING_API  # Default from module constant
        if db_streaming_setting is not None:
            use_streaming = db_streaming_setting.lower() == 'true'

        logger.info(f"Streaming mode: {use_streaming} (default: {USE_STREAMING_API}, db: {db_streaming_setting})")

        # Process video using appropriate mode
        if use_streaming and not use_mock:
            # Use streaming API for real-time frame-by-frame analysis
            logger.info("Using streaming API for emotion analysis")
            result = asyncio.run(process_reaction_video_streaming(
                file_path, reaction_id, job_id, redis_conn, api_key
            ))
        else:
            # Use batch API (or mock mode)
            logger.info("Using batch API for emotion analysis")
            analyzer = EmotionAnalyzer(api_key, force_mock=use_mock)
            result = process_reaction_video(
                file_path, reaction_id, job_id, redis_conn, analyzer
            )

        # Add processing time
        result['processing_time_seconds'] = round(time.time() - start_time, 2)

        # Save results
        publish_progress(redis_conn, job_id, 95, 'Saving results...', 'reaction_video', reaction_id)
        save_emotion_results(reaction_id, result)

        # Update status
        update_reaction_status(reaction_id, 'completed')
        publish_completed(redis_conn, job_id, 'reaction_video', reaction_id)

        logger.info(f"Emotion analysis complete for reaction {reaction_id} in {result['processing_time_seconds']}s")
        return result

    except Exception as e:
        error_msg = str(e)
        error_stack = traceback.format_exc()
        logger.error(f"Emotion analysis failed for reaction {reaction_id}: {error_msg}")

        update_reaction_status(reaction_id, 'failed', error_msg)
        publish_error(redis_conn, job_id, error_msg, error_stack, 'reaction_video', reaction_id)

        raise

def process_reaction_video(
    file_path: str,
    reaction_id: int,
    job_id: str,
    redis_conn,
    analyzer: EmotionAnalyzer
) -> Dict[str, Any]:
    """Process a reaction video for emotion analysis"""
    logger.info(f"Processing reaction video: {file_path}")

    # Initialize video processor
    processor = VideoProcessor()

    # Get video info
    publish_progress(redis_conn, job_id, 10, 'Loading video...', 'reaction_video', reaction_id)
    video_info = processor.get_video_info(file_path)
    update_reaction_video_info(reaction_id, video_info)

    # Progress callback for video analysis
    def emotion_progress(pct):
        # Emotion analysis phase: 15-85%
        progress = 15 + int(pct * 0.7)
        publish_progress(redis_conn, job_id, progress,
                        f'Analyzing emotions ({pct}%)...', 'reaction_video', reaction_id)

    publish_progress(redis_conn, job_id, 15, 'Uploading to Hume AI...', 'reaction_video', reaction_id)

    # Use the efficient video file analysis (uploads entire file to Hume)
    result = analyzer.analyze_video_file(file_path, progress_callback=emotion_progress)

    frame_results = result.get('frame_results', [])
    summary = result.get('summary', {})

    logger.info(f"Video analysis complete: {len(frame_results)} frames analyzed")

    # Calculate summary if not already done
    if not summary or summary.get('error'):
        publish_progress(redis_conn, job_id, 90, 'Calculating summary...', 'reaction_video', reaction_id)
        summary = analyzer.calculate_summary(frame_results)

    return {
        'frame_results': frame_results,
        'summary': summary,
        'video_info': video_info,
    }

async def process_reaction_video_streaming(
    file_path: str,
    reaction_id: int,
    job_id: str,
    redis_conn,
    api_key: str
) -> Dict[str, Any]:
    """Process a reaction video using streaming API for real-time analysis"""
    from ..analyzers.streaming_emotion_analyzer import StreamingEmotionAnalyzer, calculate_streaming_summary

    logger.info(f"Processing reaction video (streaming mode): {file_path}")

    # Get video info first
    processor = VideoProcessor()
    publish_progress(redis_conn, job_id, 5, 'Loading video...', 'reaction_video', reaction_id)
    video_info = processor.get_video_info(file_path)
    update_reaction_video_info(reaction_id, video_info)

    # Initialize streaming analyzer
    analyzer = StreamingEmotionAnalyzer(api_key)
    frame_results = []

    try:
        # Connect to Hume streaming API
        publish_progress(redis_conn, job_id, 10, 'Connecting to Hume streaming API...', 'reaction_video', reaction_id)
        await analyzer.connect()

        # Open video file
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {file_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0

        # Sample at 2 fps for emotion analysis
        sample_rate = 2
        frame_interval = max(1, int(fps / sample_rate))
        total_samples = int(duration * sample_rate)

        logger.info(f"Streaming analysis: duration={duration:.1f}s, fps={fps:.1f}, samples={total_samples}")

        frame_num = 0
        sample_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Sample at desired rate
            if frame_num % frame_interval == 0:
                timestamp = frame_num / fps

                # Analyze frame via streaming API
                result = await analyzer.analyze_frame(frame, frame_num, timestamp)

                if result:
                    frame_results.append(result)

                    # Real-time progress update
                    progress = 15 + int((sample_idx / max(1, total_samples)) * 70)
                    publish_progress(
                        redis_conn, job_id, progress,
                        f'Analyzing frame {sample_idx + 1}/{total_samples}...',
                        'reaction_video', reaction_id
                    )

                    # Emit frame result for real-time UI update
                    publish_frame_result(redis_conn, job_id, result, 'reaction_video', reaction_id)

                sample_idx += 1

            frame_num += 1

        cap.release()
        logger.info(f"Streaming analysis complete: {len(frame_results)} frames analyzed")

        # Calculate summary
        publish_progress(redis_conn, job_id, 90, 'Calculating summary...', 'reaction_video', reaction_id)
        summary = calculate_streaming_summary(frame_results)

        return {
            'frame_results': frame_results,
            'summary': summary,
            'video_info': video_info,
        }

    except Exception as e:
        logger.error(f"Streaming analysis failed: {e}")
        raise
    finally:
        await analyzer.close()

def update_reaction_status(reaction_id: int, status: str, error_message: str = None):
    """Update reaction video status in database"""
    from ..utils.db_utils import get_connection

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE reaction_videos SET status = %s, error_message = %s WHERE id = %s",
                (status, error_message, reaction_id)
            )

def update_reaction_video_info(reaction_id: int, video_info: Dict[str, Any]):
    """Update reaction video metadata"""
    from ..utils.db_utils import get_connection

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE reaction_videos
                SET duration_seconds = %s, fps = %s, frame_count = %s
                WHERE id = %s
            """, (
                video_info.get('duration_seconds'),
                video_info.get('fps'),
                video_info.get('frame_count'),
                reaction_id
            ))

def save_emotion_results(reaction_id: int, results: Dict[str, Any]):
    """Save emotion analysis results to database"""
    from ..utils.db_utils import get_connection
    from psycopg2.extras import Json

    frame_results = results.get('frame_results', [])
    summary = results.get('summary', {})

    with get_connection() as conn:
        with conn.cursor() as cur:
            # Save individual frame results
            for frame in frame_results:
                if not frame.get('face_detected'):
                    continue

                cur.execute("""
                    INSERT INTO emotion_frames (
                        reaction_video_id, frame_number, timestamp_seconds,
                        face_detected, face_bbox, face_confidence,
                        joy, surprise, sadness, anger, fear, disgust, contempt, interest, confusion,
                        dominant_emotion, emotional_intensity, engagement_level, raw_hume_response
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (reaction_video_id, frame_number) DO UPDATE SET
                        face_detected = EXCLUDED.face_detected,
                        joy = EXCLUDED.joy, surprise = EXCLUDED.surprise, sadness = EXCLUDED.sadness,
                        anger = EXCLUDED.anger, fear = EXCLUDED.fear, disgust = EXCLUDED.disgust,
                        contempt = EXCLUDED.contempt, interest = EXCLUDED.interest, confusion = EXCLUDED.confusion,
                        dominant_emotion = EXCLUDED.dominant_emotion,
                        emotional_intensity = EXCLUDED.emotional_intensity,
                        engagement_level = EXCLUDED.engagement_level
                """, (
                    reaction_id,
                    frame.get('frame_num', 0),
                    frame.get('timestamp', 0),
                    frame.get('face_detected', False),
                    Json(frame.get('face_bbox')),
                    frame.get('face_confidence'),
                    frame.get('joy', 0),
                    frame.get('surprise', 0),
                    frame.get('sadness', 0),
                    frame.get('anger', 0),
                    frame.get('fear', 0),
                    frame.get('disgust', 0),
                    frame.get('contempt', 0),
                    frame.get('interest', 0),
                    frame.get('confusion', 0),
                    frame.get('dominant_emotion'),
                    frame.get('emotional_intensity'),
                    frame.get('engagement_level'),
                    Json(frame),
                ))

            # Save summary
            cur.execute("""
                INSERT INTO emotion_summaries (
                    reaction_video_id,
                    avg_joy, avg_surprise, avg_sadness, avg_anger, avg_fear,
                    avg_disgust, avg_contempt, avg_interest, avg_confusion,
                    peak_joy_timestamp, peak_surprise_timestamp, peak_interest_timestamp,
                    avg_engagement, peak_engagement, engagement_trend,
                    dominant_emotion, emotional_valence, emotional_arousal,
                    emotion_timeline, frames_analyzed, frames_with_faces, processing_time_seconds
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (reaction_video_id) DO UPDATE SET
                    avg_joy = EXCLUDED.avg_joy, avg_surprise = EXCLUDED.avg_surprise,
                    avg_sadness = EXCLUDED.avg_sadness, avg_anger = EXCLUDED.avg_anger,
                    avg_fear = EXCLUDED.avg_fear, avg_disgust = EXCLUDED.avg_disgust,
                    avg_contempt = EXCLUDED.avg_contempt, avg_interest = EXCLUDED.avg_interest,
                    avg_confusion = EXCLUDED.avg_confusion,
                    avg_engagement = EXCLUDED.avg_engagement, peak_engagement = EXCLUDED.peak_engagement,
                    engagement_trend = EXCLUDED.engagement_trend, dominant_emotion = EXCLUDED.dominant_emotion,
                    emotional_valence = EXCLUDED.emotional_valence, emotional_arousal = EXCLUDED.emotional_arousal,
                    emotion_timeline = EXCLUDED.emotion_timeline,
                    frames_analyzed = EXCLUDED.frames_analyzed, frames_with_faces = EXCLUDED.frames_with_faces,
                    processing_time_seconds = EXCLUDED.processing_time_seconds
            """, (
                reaction_id,
                summary.get('avg_joy'),
                summary.get('avg_surprise'),
                summary.get('avg_sadness'),
                summary.get('avg_anger'),
                summary.get('avg_fear'),
                summary.get('avg_disgust'),
                summary.get('avg_contempt'),
                summary.get('avg_interest'),
                summary.get('avg_confusion'),
                summary.get('peak_joy_timestamp'),
                summary.get('peak_surprise_timestamp'),
                summary.get('peak_interest_timestamp'),
                summary.get('avg_engagement'),
                summary.get('peak_engagement'),
                summary.get('engagement_trend'),
                summary.get('dominant_emotion'),
                summary.get('emotional_valence'),
                summary.get('emotional_arousal'),
                Json(summary.get('emotion_timeline', [])),
                summary.get('frames_analyzed'),
                summary.get('frames_with_faces'),
                results.get('processing_time_seconds'),
            ))

# Worker entry point for RQ
def handle_emotion_job(job_data_str: str):
    """Handle emotion analysis job from Redis queue"""
    job_data = json.loads(job_data_str)
    return analyze_emotion(job_data)
