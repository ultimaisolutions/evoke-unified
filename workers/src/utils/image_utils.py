"""
Image processing utilities
"""
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, Tuple, Optional

def load_image(image_path: str) -> np.ndarray:
    """Load an image from file"""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot load image: {image_path}")
    return img

def get_image_info(image_path: str) -> Dict[str, Any]:
    """Get image metadata"""
    img = load_image(image_path)
    height, width = img.shape[:2]
    channels = img.shape[2] if len(img.shape) > 2 else 1

    return {
        'width': width,
        'height': height,
        'channels': channels,
        'aspect_ratio': width / height if height > 0 else 0,
    }

def resize_image(
    image: np.ndarray,
    max_size: int = 1280,
    maintain_aspect: bool = True
) -> np.ndarray:
    """Resize image while maintaining aspect ratio"""
    height, width = image.shape[:2]

    if max(height, width) <= max_size:
        return image

    if maintain_aspect:
        if width > height:
            new_width = max_size
            new_height = int(height * (max_size / width))
        else:
            new_height = max_size
            new_width = int(width * (max_size / height))
    else:
        new_width = new_height = max_size

    return cv2.resize(image, (new_width, new_height))

def convert_to_rgb(image: np.ndarray) -> np.ndarray:
    """Convert BGR (OpenCV default) to RGB"""
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

def convert_to_grayscale(image: np.ndarray) -> np.ndarray:
    """Convert to grayscale"""
    if len(image.shape) == 2:
        return image
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

def calculate_brightness(image: np.ndarray) -> float:
    """Calculate average brightness (0-1)"""
    if len(image.shape) == 3:
        gray = convert_to_grayscale(image)
    else:
        gray = image
    return float(np.mean(gray) / 255.0)

def calculate_contrast(image: np.ndarray) -> float:
    """Calculate image contrast (standard deviation of grayscale, normalized)"""
    if len(image.shape) == 3:
        gray = convert_to_grayscale(image)
    else:
        gray = image
    return float(np.std(gray) / 127.5)  # Normalize to roughly 0-1

def calculate_saturation(image: np.ndarray) -> float:
    """Calculate average saturation (0-1)"""
    if len(image.shape) == 2:
        return 0.0
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    return float(np.mean(hsv[:, :, 1]) / 255.0)

def get_dominant_colors(
    image: np.ndarray,
    n_colors: int = 5,
    resize_to: int = 150
) -> list:
    """
    Extract dominant colors using K-means clustering.

    Returns list of dicts with rgb, percentage, and color name.
    """
    # Resize for faster processing
    small = cv2.resize(image, (resize_to, resize_to))
    pixels = small.reshape(-1, 3).astype(np.float32)

    # K-means clustering
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 100, 0.2)
    _, labels, centers = cv2.kmeans(
        pixels, n_colors, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS
    )

    # Count pixels in each cluster
    unique, counts = np.unique(labels, return_counts=True)
    total_pixels = len(labels)

    colors = []
    for idx in np.argsort(-counts):  # Sort by frequency
        if idx < len(centers):
            bgr = centers[idx]
            rgb = [int(bgr[2]), int(bgr[1]), int(bgr[0])]  # BGR to RGB
            percentage = counts[idx] / total_pixels

            colors.append({
                'rgb': rgb,
                'hex': '#{:02x}{:02x}{:02x}'.format(*rgb),
                'percentage': round(percentage, 3),
                'name': get_color_name(rgb),
            })

    return colors

def get_color_name(rgb: list) -> str:
    """Get approximate color name from RGB values"""
    r, g, b = rgb

    # Simple color classification
    if max(r, g, b) < 50:
        return 'black'
    if min(r, g, b) > 200:
        return 'white'
    if r > 200 and g < 100 and b < 100:
        return 'red'
    if r < 100 and g > 200 and b < 100:
        return 'green'
    if r < 100 and g < 100 and b > 200:
        return 'blue'
    if r > 200 and g > 200 and b < 100:
        return 'yellow'
    if r > 200 and g < 150 and b > 200:
        return 'magenta'
    if r < 100 and g > 200 and b > 200:
        return 'cyan'
    if r > 200 and g > 100 and b < 100:
        return 'orange'
    if r > 150 and g < 100 and b > 150:
        return 'purple'
    if abs(r - g) < 30 and abs(g - b) < 30:
        return 'gray'

    return 'mixed'

def detect_edges(image: np.ndarray) -> np.ndarray:
    """Detect edges using Canny edge detection"""
    gray = convert_to_grayscale(image)
    return cv2.Canny(gray, 50, 150)
