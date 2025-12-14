import { useState } from 'react';
import { trainingApi } from '../../lib/api';
import { cn } from '../../lib/utils';
import { Save, Loader2, Star, MessageSquare } from 'lucide-react';

const RATING_CATEGORIES = [
  { key: 'attention', label: 'Attention Grab', description: 'How well did the ad capture attention?' },
  { key: 'engagement', label: 'Engagement Level', description: 'How engaged was the viewer throughout?' },
  { key: 'clarity', label: 'Message Clarity', description: 'How clear was the ad message?' },
  { key: 'emotional_impact', label: 'Emotional Impact', description: 'How strong was the emotional response?' },
  { key: 'brand_recall', label: 'Brand Recall', description: 'How memorable was the brand?' },
  { key: 'call_to_action', label: 'Call to Action', description: 'How effective was the CTA?' },
];

function RatingSlider({ label, description, value, onChange }) {
  const getSliderColor = (val) => {
    if (val <= 3) return '#ef4444';
    if (val <= 5) return '#f59e0b';
    if (val <= 7) return '#22c55e';
    return '#a855f7';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span
          className="text-xl font-bold min-w-[40px] text-right"
          style={{ color: getSliderColor(value) }}
        >
          {value}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5
                     [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform
                     [&::-webkit-slider-thumb]:hover:scale-110"
          style={{
            background: `linear-gradient(to right, ${getSliderColor(value)} 0%, ${getSliderColor(value)} ${(value - 1) / 9 * 100}%, hsl(var(--muted)) ${(value - 1) / 9 * 100}%, hsl(var(--muted)) 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
          <span>Poor</span>
          <span>Excellent</span>
        </div>
      </div>
    </div>
  );
}

export function RatingForm({ selectedAd, reaction, emotionSummary, onSubmit }) {
  const [ratings, setRatings] = useState({
    attention: 5,
    engagement: 5,
    clarity: 5,
    emotional_impact: 5,
    brand_recall: 5,
    call_to_action: 5,
  });
  const [notes, setNotes] = useState('');
  const [improvementFeedback, setImprovementFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleRatingChange = (key, value) => {
    setRatings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSubmit = async () => {
    if (!selectedAd || !reaction) return;

    try {
      setSaving(true);

      const trainingData = {
        ad_id: selectedAd.id,
        reaction_id: reaction.id,
        ratings,
        notes: notes.trim() || null,
        improvement_feedback: improvementFeedback.trim() || null,
      };

      await trainingApi.create(trainingData);
      setSaved(true);
      onSubmit?.();

    } catch (error) {
      console.error('Failed to save training data:', error);
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = !selectedAd || !reaction || !emotionSummary;
  const averageRating = Object.values(ratings).reduce((a, b) => a + b, 0) / 6;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-purple-400" />
          <h3 className="font-medium text-foreground">Rate This Response</h3>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Average:</span>
          <span className="font-bold text-purple-400">{averageRating.toFixed(1)}</span>
        </div>
      </div>

      {/* Rating sliders */}
      <div className={cn(
        'space-y-6 p-4 rounded-xl border border-border/50 bg-card/30',
        isDisabled && 'opacity-50 pointer-events-none'
      )}>
        {RATING_CATEGORIES.map(({ key, label, description }) => (
          <RatingSlider
            key={key}
            label={label}
            description={description}
            value={ratings[key]}
            onChange={(val) => handleRatingChange(key, val)}
          />
        ))}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          Observation Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder="Describe specific moments or reactions that stood out..."
          disabled={isDisabled}
          className={cn(
            'w-full h-24 px-4 py-3 rounded-xl border border-border bg-card/50',
            'placeholder:text-muted-foreground text-sm resize-none',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
            isDisabled && 'opacity-50'
          )}
        />
      </div>

      {/* Improvement suggestions */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Suggested Improvements
        </label>
        <textarea
          value={improvementFeedback}
          onChange={(e) => {
            setImprovementFeedback(e.target.value);
            setSaved(false);
          }}
          placeholder="What could make this ad more effective?"
          disabled={isDisabled}
          className={cn(
            'w-full h-24 px-4 py-3 rounded-xl border border-border bg-card/50',
            'placeholder:text-muted-foreground text-sm resize-none',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
            isDisabled && 'opacity-50'
          )}
        />
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={isDisabled || saving}
        className={cn(
          'w-full flex items-center justify-center gap-2',
          'px-4 py-3 rounded-xl font-medium',
          'transition-all duration-200',
          saved
            ? 'bg-emerald-500 text-white'
            : 'bg-purple-500 text-white hover:bg-purple-600',
          (isDisabled || saving) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : saved ? (
          <>
            <Save className="w-4 h-4" />
            Saved to Training Data
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Training Entry
          </>
        )}
      </button>

      {isDisabled && (
        <p className="text-xs text-center text-muted-foreground">
          Complete ad selection, reaction upload, and emotion analysis to enable ratings
        </p>
      )}
    </div>
  );
}

export default RatingForm;
