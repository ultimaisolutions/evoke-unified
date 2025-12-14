"""
OpenCV-based Visual Analysis
"""
import cv2
import numpy as np
from typing import Dict, Any, List, Optional, Callable
import logging

from ..utils.image_utils import (
    calculate_brightness,
    calculate_contrast,
    calculate_saturation,
    get_dominant_colors,
    convert_to_grayscale,
)

logger = logging.getLogger(__name__)

class OpenCVAnalyzer:
    """OpenCV-based visual feature extraction"""

    def analyze_frame(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Analyze a single frame for visual features.

        Args:
            frame: BGR image as numpy array

        Returns:
            Dict with visual analysis metrics
        """
        return {
            'brightness': calculate_brightness(frame),
            'contrast': calculate_contrast(frame),
            'saturation': calculate_saturation(frame),
            'dominant_colors': get_dominant_colors(frame, n_colors=5),
            'rule_of_thirds': self._calculate_rule_of_thirds(frame),
            'visual_balance': self._calculate_visual_balance(frame),
            'focal_points': self._detect_focal_points(frame),
        }

    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """Analyze a single image file"""
        frame = cv2.imread(image_path)
        if frame is None:
            raise ValueError(f"Cannot load image: {image_path}")

        analysis = self.analyze_frame(frame)
        analysis['motion_score'] = 0.0  # No motion in single image
        analysis['scene_changes'] = 0

        return self._calculate_scores(analysis)

    def analyze_video(
        self,
        frames: List[Dict[str, Any]],
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Analyze multiple frames from a video.

        Args:
            frames: List of frame dicts with 'image', 'frame_num', 'timestamp'
            progress_callback: Optional callback for progress updates

        Returns:
            Aggregated analysis results
        """
        total = len(frames)
        frame_analyses = []
        previous_frame = None
        motion_scores = []
        scene_changes = 0

        for i, frame_data in enumerate(frames):
            frame = frame_data['image']

            # Analyze visual features
            analysis = self.analyze_frame(frame)
            analysis['frame_num'] = frame_data['frame_num']
            analysis['timestamp'] = frame_data['timestamp']
            frame_analyses.append(analysis)

            # Calculate motion between frames
            if previous_frame is not None:
                motion = self._calculate_motion(previous_frame, frame)
                motion_scores.append(motion)

                # Detect scene changes (significant histogram difference)
                if self._detect_scene_change(previous_frame, frame):
                    scene_changes += 1

            previous_frame = frame.copy()

            if progress_callback and (i + 1) % 5 == 0:
                progress_callback(int((i + 1) / total * 100))

        # Aggregate results
        return self._aggregate_analysis(frame_analyses, motion_scores, scene_changes)

    def _calculate_rule_of_thirds(self, frame: np.ndarray) -> float:
        """
        Calculate how well the image follows the rule of thirds.
        Higher score = better alignment with rule of thirds grid.
        """
        gray = convert_to_grayscale(frame)
        height, width = gray.shape

        # Define rule of thirds lines
        h_lines = [height // 3, 2 * height // 3]
        v_lines = [width // 3, 2 * width // 3]

        # Detect edges for interest points
        edges = cv2.Canny(gray, 50, 150)

        # Calculate edge density around rule of thirds intersections
        intersection_score = 0
        intersection_count = 0

        for h in h_lines:
            for v in v_lines:
                # Check 50px region around intersection
                region_size = 50
                y1 = max(0, h - region_size)
                y2 = min(height, h + region_size)
                x1 = max(0, v - region_size)
                x2 = min(width, v + region_size)

                region = edges[y1:y2, x1:x2]
                intersection_score += np.mean(region) / 255.0
                intersection_count += 1

        return round(intersection_score / intersection_count, 3) if intersection_count > 0 else 0

    def _calculate_visual_balance(self, frame: np.ndarray) -> float:
        """
        Calculate visual balance between left/right and top/bottom halves.
        Score closer to 1.0 = more balanced
        """
        gray = convert_to_grayscale(frame)
        height, width = gray.shape

        # Compare left vs right
        left_half = gray[:, :width // 2]
        right_half = gray[:, width // 2:]
        lr_diff = abs(np.mean(left_half) - np.mean(right_half)) / 255.0

        # Compare top vs bottom
        top_half = gray[:height // 2, :]
        bottom_half = gray[height // 2:, :]
        tb_diff = abs(np.mean(top_half) - np.mean(bottom_half)) / 255.0

        # Balance score (1.0 = perfectly balanced, 0.0 = extremely unbalanced)
        balance = 1.0 - (lr_diff + tb_diff) / 2
        return round(max(0, min(1, balance)), 3)

    def _detect_focal_points(self, frame: np.ndarray, max_points: int = 5) -> List[Dict]:
        """
        Detect potential focal points using corner detection.
        """
        gray = convert_to_grayscale(frame)
        height, width = gray.shape

        # Use Shi-Tomasi corner detection
        corners = cv2.goodFeaturesToTrack(
            gray, maxCorners=max_points * 2, qualityLevel=0.01, minDistance=50
        )

        focal_points = []
        if corners is not None:
            for corner in corners[:max_points]:
                x, y = corner.ravel()
                focal_points.append({
                    'x': int(x),
                    'y': int(y),
                    'normalized_x': round(x / width, 3),
                    'normalized_y': round(y / height, 3),
                })

        return focal_points

    def _calculate_motion(self, frame1: np.ndarray, frame2: np.ndarray) -> float:
        """
        Calculate motion score between two frames using optical flow.
        """
        gray1 = convert_to_grayscale(frame1)
        gray2 = convert_to_grayscale(frame2)

        # Calculate dense optical flow
        flow = cv2.calcOpticalFlowFarneback(
            gray1, gray2, None, 0.5, 3, 15, 3, 5, 1.2, 0
        )

        # Calculate magnitude of motion vectors
        magnitude = np.sqrt(flow[:, :, 0] ** 2 + flow[:, :, 1] ** 2)
        motion_score = np.mean(magnitude)

        # Normalize to 0-1 range (empirically, values above 10 indicate high motion)
        return min(motion_score / 10.0, 1.0)

    def _detect_scene_change(
        self,
        frame1: np.ndarray,
        frame2: np.ndarray,
        threshold: float = 0.3
    ) -> bool:
        """
        Detect if there's a scene change between frames using histogram comparison.
        """
        # Convert to HSV for better color comparison
        hsv1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2HSV)
        hsv2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2HSV)

        # Calculate histograms
        hist1 = cv2.calcHist([hsv1], [0, 1], None, [50, 60], [0, 180, 0, 256])
        hist2 = cv2.calcHist([hsv2], [0, 1], None, [50, 60], [0, 180, 0, 256])

        # Normalize
        cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)

        # Compare histograms
        correlation = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)

        return correlation < (1 - threshold)

    def _aggregate_analysis(
        self,
        frame_analyses: List[Dict],
        motion_scores: List[float],
        scene_changes: int
    ) -> Dict[str, Any]:
        """Aggregate analysis from multiple frames"""
        # Calculate averages
        avg_brightness = np.mean([f['brightness'] for f in frame_analyses])
        avg_contrast = np.mean([f['contrast'] for f in frame_analyses])
        avg_saturation = np.mean([f['saturation'] for f in frame_analyses])
        avg_rule_of_thirds = np.mean([f['rule_of_thirds'] for f in frame_analyses])
        avg_visual_balance = np.mean([f['visual_balance'] for f in frame_analyses])
        avg_motion = np.mean(motion_scores) if motion_scores else 0

        # Get dominant colors from middle frame (representative)
        mid_idx = len(frame_analyses) // 2
        dominant_colors = frame_analyses[mid_idx]['dominant_colors'] if frame_analyses else []

        result = {
            'brightness_avg': round(avg_brightness, 3),
            'contrast_avg': round(avg_contrast, 3),
            'saturation_avg': round(avg_saturation, 3),
            'rule_of_thirds_score': round(avg_rule_of_thirds, 3),
            'visual_balance_score': round(avg_visual_balance, 3),
            'motion_score': round(avg_motion, 3),
            'scene_changes': scene_changes,
            'dominant_colors': dominant_colors,
            'focal_points': frame_analyses[mid_idx]['focal_points'] if frame_analyses else [],
            'frames_analyzed': len(frame_analyses),
        }

        return self._calculate_scores(result)

    def _calculate_scores(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate overall visual scores from raw metrics"""
        # Visual appeal: based on saturation, contrast, and color variety
        color_variety = len(analysis.get('dominant_colors', [])) / 5.0
        visual_appeal = (
            analysis.get('saturation_avg', 0.5) * 0.3 +
            analysis.get('contrast_avg', 0.5) * 0.3 +
            color_variety * 0.4
        ) * 100

        # Clarity: based on contrast and brightness being in good range
        brightness = analysis.get('brightness_avg', 0.5)
        brightness_score = 1 - abs(brightness - 0.5) * 2  # Best around 0.5
        clarity = (
            analysis.get('contrast_avg', 0.5) * 0.6 +
            brightness_score * 0.4
        ) * 100

        # Attention grab: motion, scene changes, and composition
        motion = analysis.get('motion_score', 0)
        scene_variety = min(analysis.get('scene_changes', 0) / 10.0, 1.0)
        composition = (
            analysis.get('rule_of_thirds_score', 0.5) +
            analysis.get('visual_balance_score', 0.5)
        ) / 2
        attention_grab = (
            motion * 0.3 +
            scene_variety * 0.3 +
            composition * 0.4
        ) * 100

        # Overall score
        overall = (visual_appeal + clarity + attention_grab) / 3

        analysis['visual_appeal_score'] = round(visual_appeal, 1)
        analysis['clarity_score'] = round(clarity, 1)
        analysis['attention_grab_score'] = round(attention_grab, 1)
        analysis['overall_score'] = round(overall, 1)

        return analysis
