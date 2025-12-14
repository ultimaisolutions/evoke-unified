"""
Improvement Suggestion Engine
Generates actionable suggestions based on analysis results
"""
from typing import Dict, Any, List

class SuggestionEngine:
    """Generate improvement suggestions based on ad analysis"""

    def generate_suggestions(self, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate improvement suggestions based on analysis results.

        Args:
            analysis: Combined analysis results from YOLO and OpenCV

        Returns:
            List of suggestion objects with category, suggestion, and priority
        """
        suggestions = []

        # Brightness suggestions
        brightness = analysis.get('brightness_avg', 0.5)
        if brightness < 0.3:
            suggestions.append({
                'category': 'lighting',
                'suggestion': 'The ad appears too dark. Consider increasing brightness or using lighter backgrounds to improve visibility.',
                'priority': 'high',
                'metric': 'brightness',
                'current_value': round(brightness, 2),
                'recommended_range': [0.4, 0.7],
            })
        elif brightness > 0.8:
            suggestions.append({
                'category': 'lighting',
                'suggestion': 'The ad may be overexposed. Consider reducing brightness or adding more contrast for better visual impact.',
                'priority': 'medium',
                'metric': 'brightness',
                'current_value': round(brightness, 2),
                'recommended_range': [0.4, 0.7],
            })

        # Contrast suggestions
        contrast = analysis.get('contrast_avg', 0.5)
        if contrast < 0.3:
            suggestions.append({
                'category': 'contrast',
                'suggestion': 'Low contrast makes the ad feel flat. Increase contrast between elements to improve visual hierarchy and readability.',
                'priority': 'high',
                'metric': 'contrast',
                'current_value': round(contrast, 2),
                'recommended_range': [0.4, 0.8],
            })

        # Saturation suggestions
        saturation = analysis.get('saturation_avg', 0.5)
        if saturation < 0.2:
            suggestions.append({
                'category': 'color',
                'suggestion': 'The ad lacks color vibrancy. Consider adding more saturated colors to grab attention and convey energy.',
                'priority': 'medium',
                'metric': 'saturation',
                'current_value': round(saturation, 2),
                'recommended_range': [0.3, 0.7],
            })
        elif saturation > 0.85:
            suggestions.append({
                'category': 'color',
                'suggestion': 'Colors may be oversaturated. This can strain viewer eyes. Consider toning down colors for a more professional look.',
                'priority': 'low',
                'metric': 'saturation',
                'current_value': round(saturation, 2),
                'recommended_range': [0.3, 0.7],
            })

        # Composition suggestions
        rule_of_thirds = analysis.get('rule_of_thirds_score', 0.5)
        if rule_of_thirds < 0.2:
            suggestions.append({
                'category': 'composition',
                'suggestion': 'Key elements are not aligned with rule of thirds. Position important elements at intersection points for better visual flow.',
                'priority': 'medium',
                'metric': 'rule_of_thirds_score',
                'current_value': round(rule_of_thirds, 2),
                'recommended_range': [0.3, 1.0],
            })

        # Visual balance suggestions
        visual_balance = analysis.get('visual_balance_score', 0.5)
        if visual_balance < 0.4:
            suggestions.append({
                'category': 'composition',
                'suggestion': 'The visual weight is unbalanced. Redistribute elements more evenly across the frame for a more harmonious composition.',
                'priority': 'medium',
                'metric': 'visual_balance_score',
                'current_value': round(visual_balance, 2),
                'recommended_range': [0.5, 1.0],
            })

        # Motion suggestions (for videos)
        motion = analysis.get('motion_score', 0)
        if motion > 0 and motion < 0.1:
            suggestions.append({
                'category': 'motion',
                'suggestion': 'Very little movement detected. Consider adding motion, transitions, or dynamic elements to increase engagement.',
                'priority': 'medium',
                'metric': 'motion_score',
                'current_value': round(motion, 2),
                'recommended_range': [0.1, 0.6],
            })
        elif motion > 0.7:
            suggestions.append({
                'category': 'motion',
                'suggestion': 'High motion may be disorienting. Consider slowing down transitions or adding stable moments for the message to land.',
                'priority': 'low',
                'metric': 'motion_score',
                'current_value': round(motion, 2),
                'recommended_range': [0.1, 0.6],
            })

        # Scene changes suggestions
        scene_changes = analysis.get('scene_changes', 0)
        frames = analysis.get('frames_analyzed', 1)
        if frames > 10:  # Only for videos
            changes_per_second = scene_changes / (frames / 2)  # Assuming 2 fps sample rate
            if changes_per_second > 1:
                suggestions.append({
                    'category': 'pacing',
                    'suggestion': 'Too many scene changes may overwhelm viewers. Consider longer shots to let key moments resonate.',
                    'priority': 'medium',
                    'metric': 'scene_changes_per_second',
                    'current_value': round(changes_per_second, 2),
                    'recommended_range': [0.2, 0.8],
                })
            elif scene_changes == 0 and frames > 20:
                suggestions.append({
                    'category': 'pacing',
                    'suggestion': 'No scene variety detected. Consider adding cuts or transitions to maintain viewer interest.',
                    'priority': 'low',
                    'metric': 'scene_changes',
                    'current_value': scene_changes,
                    'recommended_range': [2, 10],
                })

        # People presence suggestions
        person_presence = analysis.get('person_presence_ratio', 0)
        if person_presence == 0:
            suggestions.append({
                'category': 'content',
                'suggestion': 'No people detected in the ad. Ads with human faces typically generate 38% more engagement. Consider adding human elements.',
                'priority': 'medium',
                'metric': 'person_presence_ratio',
                'current_value': 0,
                'recommended_range': [0.3, 1.0],
            })

        # Color variety suggestions
        colors = analysis.get('dominant_colors', [])
        if len(colors) < 3:
            suggestions.append({
                'category': 'color',
                'suggestion': 'Limited color palette detected. Consider adding accent colors to create visual interest and guide attention.',
                'priority': 'low',
                'metric': 'color_variety',
                'current_value': len(colors),
                'recommended_range': [3, 5],
            })

        # Overall score suggestions
        overall = analysis.get('overall_score', 50)
        if overall < 40:
            suggestions.insert(0, {
                'category': 'overall',
                'suggestion': 'This ad scores below average. Focus on the high-priority suggestions above to significantly improve effectiveness.',
                'priority': 'critical',
                'metric': 'overall_score',
                'current_value': round(overall, 1),
                'recommended_range': [60, 100],
            })
        elif overall >= 80:
            suggestions.append({
                'category': 'overall',
                'suggestion': 'Great job! This ad scores well above average. Minor tweaks could push it to excellent.',
                'priority': 'info',
                'metric': 'overall_score',
                'current_value': round(overall, 1),
                'recommended_range': [60, 100],
            })

        # Sort by priority
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'info': 4}
        suggestions.sort(key=lambda x: priority_order.get(x['priority'], 5))

        return suggestions
