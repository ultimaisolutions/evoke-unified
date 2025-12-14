"""
Video processing utilities
"""
import cv2
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List, Dict, Any, Callable, Optional

class VideoProcessor:
    """Handles video frame extraction and processing"""

    def __init__(self, num_workers: int = 4):
        self.num_workers = num_workers

    def get_video_info(self, video_path: str) -> Dict[str, Any]:
        """Get video metadata"""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        info = {
            'fps': cap.get(cv2.CAP_PROP_FPS),
            'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
            'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'duration_seconds': 0,
        }

        if info['fps'] > 0:
            info['duration_seconds'] = info['frame_count'] / info['fps']

        cap.release()
        return info

    def extract_frames(
        self,
        video_path: str,
        sample_rate: int = 2,
        max_frames: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Extract frames at given sample rate (frames per second).

        Args:
            video_path: Path to video file
            sample_rate: Number of frames to extract per second
            max_frames: Maximum number of frames to extract (None for all)

        Returns:
            List of dicts with frame_num, timestamp, and image (numpy array)
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Calculate frame interval
        frame_interval = max(1, int(fps / sample_rate))

        frames = []
        frame_num = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_num % frame_interval == 0:
                frames.append({
                    'frame_num': frame_num,
                    'timestamp': frame_num / fps if fps > 0 else 0,
                    'image': frame
                })

                if max_frames and len(frames) >= max_frames:
                    break

            frame_num += 1

        cap.release()
        return frames

    def extract_single_frame(self, video_path: str, frame_num: int = 0) -> Any:
        """Extract a single frame (useful for thumbnails)"""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
        ret, frame = cap.read()
        cap.release()

        if not ret:
            raise ValueError(f"Cannot read frame {frame_num}")

        return frame

    def process_frames_parallel(
        self,
        frames: List[Dict[str, Any]],
        processor_fn: Callable,
        max_workers: Optional[int] = None
    ) -> List[Any]:
        """
        Process frames in parallel using thread pool.

        Args:
            frames: List of frame dicts with 'image' key
            processor_fn: Function to apply to each frame
            max_workers: Number of worker threads

        Returns:
            List of processor results
        """
        workers = max_workers or self.num_workers

        with ThreadPoolExecutor(max_workers=workers) as executor:
            results = list(executor.map(processor_fn, frames))

        return results

    def create_thumbnail(
        self,
        video_path: str,
        output_path: str,
        size: tuple = (320, 180),
        frame_num: int = 0
    ) -> str:
        """Create a thumbnail from a video frame"""
        frame = self.extract_single_frame(video_path, frame_num)
        thumbnail = cv2.resize(frame, size)
        cv2.imwrite(output_path, thumbnail)
        return output_path
