"""
YOLOv5 Object Detection Analyzer
"""
import logging
from typing import Dict, Any, List, Optional, Callable
from pathlib import Path

logger = logging.getLogger(__name__)

class YoloAnalyzer:
    """YOLOv5-based object detection for advertisements"""

    def __init__(self, model_size: str = 'yolov5m', confidence: float = 0.25):
        """
        Initialize YOLO analyzer.

        Args:
            model_size: YOLOv5 model variant (yolov5n, yolov5s, yolov5m, yolov5l, yolov5x)
            confidence: Minimum confidence threshold for detections
        """
        self.model_size = model_size
        self.confidence = confidence
        self.model = None

    def _load_model(self):
        """Lazy load the YOLO model"""
        if self.model is None:
            import torch
            logger.info(f"Loading YOLOv5 model: {self.model_size}")
            self.model = torch.hub.load('ultralytics/yolov5', self.model_size)
            self.model.conf = self.confidence
            logger.info("YOLOv5 model loaded successfully")

    def analyze_frame(self, frame) -> List[Dict[str, Any]]:
        """
        Detect objects in a single frame.

        Args:
            frame: numpy array (BGR image from OpenCV)

        Returns:
            List of detected objects with class, confidence, and bbox
        """
        self._load_model()

        results = self.model(frame)

        detections = []
        for *xyxy, conf, cls in results.xyxy[0]:
            detections.append({
                'class': self.model.names[int(cls)],
                'confidence': float(conf),
                'bbox': [float(x) for x in xyxy],
            })

        return detections

    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        Analyze a single image.

        Args:
            image_path: Path to the image file

        Returns:
            Analysis results with detections and aggregated stats
        """
        import cv2
        frame = cv2.imread(image_path)
        if frame is None:
            raise ValueError(f"Cannot load image: {image_path}")

        detections = self.analyze_frame(frame)
        return self._aggregate_detections([{'detections': detections, 'frame_num': 0}])

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
        self._load_model()

        all_frame_detections = []
        total = len(frames)

        for i, frame_data in enumerate(frames):
            detections = self.analyze_frame(frame_data['image'])

            all_frame_detections.append({
                'frame_num': frame_data['frame_num'],
                'timestamp': frame_data['timestamp'],
                'detections': detections,
            })

            if progress_callback and (i + 1) % 5 == 0:  # Update every 5 frames
                progress_callback(int((i + 1) / total * 100))

        return self._aggregate_detections(all_frame_detections)

    def _aggregate_detections(self, frame_detections: List[Dict]) -> Dict[str, Any]:
        """Aggregate detections from multiple frames"""
        unique_objects = {}
        person_frames = 0
        face_frames = 0
        text_frames = 0
        total_frames = len(frame_detections)

        for frame_data in frame_detections:
            frame_classes = set()
            for det in frame_data['detections']:
                cls = det['class']
                conf = det['confidence']
                frame_classes.add(cls)

                # Track best confidence for each object type
                if cls not in unique_objects or conf > unique_objects[cls]['max_confidence']:
                    unique_objects[cls] = {
                        'class': cls,
                        'max_confidence': conf,
                        'frame_count': 0,
                    }
                unique_objects[cls]['frame_count'] += 1

            # Count special detections
            if 'person' in frame_classes:
                person_frames += 1
            # YOLO doesn't have a 'face' class, but 'person' is a proxy
            # For text, we'd need OCR, but YOLO might detect 'book' or similar
            if any(c in frame_classes for c in ['book', 'cell phone', 'laptop', 'tv']):
                text_frames += 1

        # Build detected objects list
        detected_objects = []
        for obj_data in sorted(
            unique_objects.values(),
            key=lambda x: x['frame_count'],
            reverse=True
        ):
            detected_objects.append({
                'class': obj_data['class'],
                'confidence': round(obj_data['max_confidence'], 3),
                'presence_ratio': round(obj_data['frame_count'] / total_frames, 3),
            })

        return {
            'detected_objects': detected_objects,
            'unique_object_classes': list(unique_objects.keys()),
            'person_count': person_frames,
            'person_presence_ratio': person_frames / total_frames if total_frames > 0 else 0,
            'face_count': 0,  # Would need face detection model
            'text_detected': text_frames > 0,
            'total_frames_analyzed': total_frames,
            'frame_detections': frame_detections[:10],  # Keep first 10 for raw output
        }
