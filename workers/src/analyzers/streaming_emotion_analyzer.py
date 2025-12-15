"""
Streaming Emotion Analyzer using Hume AI WebSocket API
Real-time frame-by-frame emotion analysis
"""
import asyncio
import base64
import json
import logging
import cv2
import numpy as np
from typing import Dict, Any, Optional, Callable

logger = logging.getLogger(__name__)

# Emotion name mapping (Hume -> our schema)
EMOTION_MAPPING = {
    'Joy': 'joy',
    'Surprise': 'surprise',
    'Sadness': 'sadness',
    'Anger': 'anger',
    'Fear': 'fear',
    'Disgust': 'disgust',
    'Contempt': 'contempt',
    'Interest': 'interest',
    'Confusion': 'confusion',
}


class StreamingEmotionAnalyzer:
    """Real-time emotion analysis via Hume WebSocket streaming API"""

    def __init__(self, api_key: str):
        """
        Initialize the streaming emotion analyzer.

        Args:
            api_key: Hume AI API key
        """
        self.api_key = api_key
        self.websocket = None
        self.connected = False
        self._frame_count = 0

    async def connect(self):
        """Establish WebSocket connection to Hume streaming API"""
        try:
            import websockets
        except ImportError:
            raise ImportError("websockets package required. Install with: pip install websockets")

        uri = "wss://api.hume.ai/v0/stream/models"
        headers = {"X-Hume-Api-Key": self.api_key}

        logger.info(f"Connecting to Hume streaming API: {uri}")

        self.websocket = await websockets.connect(
            uri,
            extra_headers=headers,
            ping_interval=30,
            ping_timeout=10,
            close_timeout=5
        )
        self.connected = True
        logger.info("Connected to Hume streaming API")
        return True

    async def send_frame(self, frame_array: np.ndarray, frame_num: int = 0, timestamp: float = 0.0):
        """
        Send a single video frame for emotion analysis.

        Args:
            frame_array: BGR image as numpy array (from OpenCV)
            frame_num: Frame number in the video
            timestamp: Timestamp in seconds
        """
        if not self.connected or not self.websocket:
            raise RuntimeError("Not connected to Hume streaming API")

        # Encode frame to JPEG and then base64
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 85]
        _, buffer = cv2.imencode('.jpg', frame_array, encode_params)
        base64_frame = base64.b64encode(buffer.tobytes()).decode('utf-8')

        # Construct message for Hume streaming API
        message = {
            "data": base64_frame,
            "models": {
                "face": {}
            },
            "raw_text": False
        }

        await self.websocket.send(json.dumps(message))
        self._frame_count += 1
        logger.debug(f"Sent frame {frame_num} (timestamp: {timestamp:.2f}s)")

    async def receive_prediction(self, timeout: float = 10.0) -> Optional[Dict[str, Any]]:
        """
        Receive prediction for the last sent frame.

        Args:
            timeout: Maximum time to wait for response

        Returns:
            Parsed prediction data or None if timeout/error
        """
        if not self.connected or not self.websocket:
            return None

        try:
            response = await asyncio.wait_for(
                self.websocket.recv(),
                timeout=timeout
            )
            data = json.loads(response)

            # Check for errors in response
            if 'error' in data:
                logger.warning(f"Hume API error: {data['error']}")
                return None

            return data

        except asyncio.TimeoutError:
            logger.warning(f"Timeout waiting for prediction (>{timeout}s)")
            return None
        except Exception as e:
            logger.error(f"Error receiving prediction: {e}")
            return None

    async def analyze_frame(self, frame_array: np.ndarray, frame_num: int, timestamp: float) -> Optional[Dict[str, Any]]:
        """
        Send frame and receive prediction in one call.

        Args:
            frame_array: BGR image as numpy array
            frame_num: Frame number
            timestamp: Timestamp in seconds

        Returns:
            Parsed frame result or None
        """
        await self.send_frame(frame_array, frame_num, timestamp)
        prediction = await self.receive_prediction()

        if prediction:
            return self.parse_prediction(prediction, frame_num, timestamp)
        return None

    def parse_prediction(self, prediction: Dict[str, Any], frame_num: int, timestamp: float) -> Dict[str, Any]:
        """
        Parse Hume streaming API prediction into our frame result format.

        Args:
            prediction: Raw prediction from Hume API
            frame_num: Frame number
            timestamp: Timestamp in seconds

        Returns:
            Normalized frame result dictionary
        """
        try:
            # Extract face predictions from response
            face_data = prediction.get('face', {})
            predictions = face_data.get('predictions', [])

            if not predictions:
                return {
                    'frame_num': frame_num,
                    'timestamp': timestamp,
                    'face_detected': False
                }

            # Get first face prediction
            first_face = predictions[0]
            emotions_list = first_face.get('emotions', [])

            # Convert emotions list to dict with our naming
            emotion_scores = {}
            for emotion in emotions_list:
                name = emotion.get('name', '')
                score = emotion.get('score', 0)
                mapped_name = EMOTION_MAPPING.get(name)
                if mapped_name:
                    emotion_scores[mapped_name] = round(score, 4)

            # Fill missing emotions with 0
            for emotion in ['joy', 'surprise', 'sadness', 'anger', 'fear', 'disgust', 'contempt', 'interest', 'confusion']:
                if emotion not in emotion_scores:
                    emotion_scores[emotion] = 0.0

            # Calculate derived metrics
            dominant = max(emotion_scores, key=emotion_scores.get)
            engagement = (
                emotion_scores.get('joy', 0) * 0.3 +
                emotion_scores.get('interest', 0) * 0.4 +
                emotion_scores.get('surprise', 0) * 0.2 +
                (1 - emotion_scores.get('confusion', 0)) * 0.1
            )
            intensity = sum(emotion_scores.values()) / len(emotion_scores)

            # Extract bounding box if available
            bbox = first_face.get('bbox', {})
            face_bbox = None
            if bbox:
                face_bbox = {
                    'x': bbox.get('x', 0),
                    'y': bbox.get('y', 0),
                    'width': bbox.get('w', 0),
                    'height': bbox.get('h', 0),
                }

            return {
                'frame_num': frame_num,
                'timestamp': timestamp,
                'face_detected': True,
                'face_bbox': face_bbox,
                'face_confidence': first_face.get('prob', 0.9),
                **emotion_scores,
                'dominant_emotion': dominant,
                'emotional_intensity': round(intensity, 3),
                'engagement_level': round(engagement, 3),
            }

        except Exception as e:
            logger.error(f"Error parsing prediction: {e}")
            return {
                'frame_num': frame_num,
                'timestamp': timestamp,
                'face_detected': False,
                'error': str(e)
            }

    async def close(self):
        """Close WebSocket connection"""
        if self.websocket:
            try:
                await self.websocket.close()
                logger.info(f"Closed Hume streaming connection (processed {self._frame_count} frames)")
            except Exception as e:
                logger.warning(f"Error closing websocket: {e}")
            finally:
                self.websocket = None
                self.connected = False

    async def __aenter__(self):
        """Async context manager entry"""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()


async def analyze_video_streaming(
    video_path: str,
    api_key: str,
    sample_rate: int = 2,
    progress_callback: Optional[Callable[[int, Dict], None]] = None
) -> Dict[str, Any]:
    """
    Analyze a video file using streaming API.

    Args:
        video_path: Path to video file
        api_key: Hume API key
        sample_rate: Frames per second to analyze
        progress_callback: Optional callback(progress_percent, frame_result)

    Returns:
        Dict with frame_results and summary
    """
    analyzer = StreamingEmotionAnalyzer(api_key)
    frame_results = []

    try:
        await analyzer.connect()

        # Open video file
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0

        # Calculate frame interval for desired sample rate
        frame_interval = max(1, int(fps / sample_rate))
        total_samples = int(duration * sample_rate)

        logger.info(f"Streaming analysis: {video_path}")
        logger.info(f"  Duration: {duration:.1f}s, FPS: {fps:.1f}, Samples: {total_samples}")

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

                    # Progress callback
                    if progress_callback:
                        progress = int((sample_idx / max(1, total_samples)) * 100)
                        progress_callback(progress, result)

                sample_idx += 1

            frame_num += 1

        cap.release()

        # Calculate summary from results
        summary = calculate_streaming_summary(frame_results)

        return {
            'frame_results': frame_results,
            'summary': summary,
        }

    except Exception as e:
        logger.error(f"Streaming analysis failed: {e}")
        raise
    finally:
        await analyzer.close()


def calculate_streaming_summary(frame_results: list) -> Dict[str, Any]:
    """
    Calculate emotion summary from frame results.

    Args:
        frame_results: List of frame result dictionaries

    Returns:
        Summary dictionary with averages, peaks, and trends
    """
    if not frame_results:
        return {'error': 'No frame results'}

    frames_with_faces = [f for f in frame_results if f.get('face_detected')]

    if not frames_with_faces:
        return {
            'error': 'No faces detected',
            'frames_analyzed': len(frame_results),
            'frames_with_faces': 0
        }

    # Calculate averages
    emotions = ['joy', 'surprise', 'sadness', 'anger', 'fear', 'disgust', 'contempt', 'interest', 'confusion']
    averages = {}
    peaks = {}

    for emotion in emotions:
        values = [f.get(emotion, 0) for f in frames_with_faces]
        averages[f'avg_{emotion}'] = round(sum(values) / len(values), 3) if values else 0

        # Find peak timestamp
        if values:
            peak_idx = values.index(max(values))
            peaks[f'peak_{emotion}_timestamp'] = frames_with_faces[peak_idx].get('timestamp', 0)

    # Calculate engagement metrics
    engagement_values = [f.get('engagement_level', 0) for f in frames_with_faces]
    avg_engagement = sum(engagement_values) / len(engagement_values) if engagement_values else 0
    peak_engagement = max(engagement_values) if engagement_values else 0

    # Determine engagement trend (comparing first half to second half)
    mid = len(engagement_values) // 2
    if mid > 0:
        first_half_avg = sum(engagement_values[:mid]) / mid
        second_half_avg = sum(engagement_values[mid:]) / (len(engagement_values) - mid)
        if second_half_avg > first_half_avg * 1.1:
            trend = 'increasing'
        elif second_half_avg < first_half_avg * 0.9:
            trend = 'decreasing'
        else:
            trend = 'stable'
    else:
        trend = 'stable'

    # Determine dominant emotion across all frames
    emotion_totals = {e: sum(f.get(e, 0) for f in frames_with_faces) for e in emotions}
    dominant_emotion = max(emotion_totals, key=emotion_totals.get)

    # Calculate valence and arousal
    positive_emotions = ['joy', 'surprise', 'interest']
    negative_emotions = ['sadness', 'anger', 'fear', 'disgust', 'contempt']

    positive_sum = sum(averages.get(f'avg_{e}', 0) for e in positive_emotions)
    negative_sum = sum(averages.get(f'avg_{e}', 0) for e in negative_emotions)
    valence = (positive_sum - negative_sum) / max(positive_sum + negative_sum, 0.001)

    high_arousal = ['anger', 'fear', 'surprise', 'joy']
    low_arousal = ['sadness', 'contempt']
    high_sum = sum(averages.get(f'avg_{e}', 0) for e in high_arousal)
    low_sum = sum(averages.get(f'avg_{e}', 0) for e in low_arousal)
    arousal = (high_sum - low_sum) / max(high_sum + low_sum, 0.001)

    # Build emotion timeline (sample every ~5 seconds)
    timeline = []
    sample_interval = max(1, len(frames_with_faces) // 12)
    for i in range(0, len(frames_with_faces), sample_interval):
        f = frames_with_faces[i]
        timeline.append({
            'timestamp': f.get('timestamp', 0),
            'engagement': f.get('engagement_level', 0),
            'dominant': f.get('dominant_emotion', 'neutral'),
        })

    return {
        **averages,
        'peak_joy_timestamp': peaks.get('peak_joy_timestamp'),
        'peak_surprise_timestamp': peaks.get('peak_surprise_timestamp'),
        'peak_interest_timestamp': peaks.get('peak_interest_timestamp'),
        'avg_engagement': round(avg_engagement, 3),
        'peak_engagement': round(peak_engagement, 3),
        'engagement_trend': trend,
        'dominant_emotion': dominant_emotion,
        'emotional_valence': round(valence, 3),
        'emotional_arousal': round(arousal, 3),
        'emotion_timeline': timeline,
        'frames_analyzed': len(frame_results),
        'frames_with_faces': len(frames_with_faces),
    }
