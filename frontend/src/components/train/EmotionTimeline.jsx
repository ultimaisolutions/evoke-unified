import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { reactionsApi } from '../../lib/api';
import { cn } from '../../lib/utils';
import { TrendingUp, Smile, Zap, Heart, Loader2 } from 'lucide-react';

const EMOTION_COLORS = {
  joy: '#22c55e',
  interest: '#a855f7',
  surprise: '#f59e0b',
  engagement: '#3b82f6',
};

const EMOTION_CONFIG = [
  { key: 'joy', name: 'Joy', color: EMOTION_COLORS.joy },
  { key: 'interest', name: 'Interest', color: EMOTION_COLORS.interest },
  { key: 'surprise', name: 'Surprise', color: EMOTION_COLORS.surprise },
  { key: 'engagement', name: 'Engagement', color: EMOTION_COLORS.engagement },
];

function StatCard({ icon: Icon, label, value, color, subtext }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload) return null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-xl p-3 min-w-[150px]">
      <p className="text-xs text-muted-foreground mb-2">{label}s</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium text-foreground">
            {(entry.value * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function EmotionTimeline({ reactionId, emotionSummary }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeEmotions, setActiveEmotions] = useState(['interest', 'engagement']);

  useEffect(() => {
    if (reactionId) {
      loadTimeline();
    } else if (emotionSummary?.emotion_timeline) {
      setTimeline(emotionSummary.emotion_timeline);
    }
  }, [reactionId, emotionSummary]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const result = await reactionsApi.getTimeline(reactionId);
      setTimeline(result.data.timeline || []);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmotion = (key) => {
    setActiveEmotions(prev =>
      prev.includes(key)
        ? prev.filter(e => e !== key)
        : [...prev, key]
    );
  };

  if (!emotionSummary && !reactionId) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 p-8 text-center">
        <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">
          Upload and analyze a reaction video to see emotional timeline
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  const summary = emotionSummary || {};

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Smile}
          label="Avg Joy"
          value={`${((summary.avg_joy || 0) * 100).toFixed(0)}%`}
          color={EMOTION_COLORS.joy}
        />
        <StatCard
          icon={Zap}
          label="Avg Interest"
          value={`${((summary.avg_interest || 0) * 100).toFixed(0)}%`}
          color={EMOTION_COLORS.interest}
        />
        <StatCard
          icon={TrendingUp}
          label="Engagement"
          value={`${((summary.avg_engagement || 0) * 100).toFixed(0)}%`}
          color={EMOTION_COLORS.engagement}
          subtext={summary.engagement_trend}
        />
        <StatCard
          icon={Heart}
          label="Valence"
          value={summary.emotional_valence?.toFixed(2) || '0'}
          color={summary.emotional_valence > 0 ? '#22c55e' : '#ef4444'}
          subtext={summary.emotional_valence > 0 ? 'Positive' : 'Negative'}
        />
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border/50 bg-card/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-foreground">Emotion Timeline</h4>

          {/* Legend toggles */}
          <div className="flex items-center gap-2">
            {EMOTION_CONFIG.map(({ key, name, color }) => (
              <button
                key={key}
                onClick={() => toggleEmotion(key)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                  activeEmotions.includes(key)
                    ? 'bg-opacity-20 border'
                    : 'bg-muted text-muted-foreground'
                )}
                style={{
                  backgroundColor: activeEmotions.includes(key) ? `${color}20` : undefined,
                  borderColor: activeEmotions.includes(key) ? `${color}50` : 'transparent',
                  color: activeEmotions.includes(key) ? color : undefined,
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[300px]">
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  {EMOTION_CONFIG.map(({ key, color }) => (
                    <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey="t"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => `${v}s`}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  domain={[0, 1]}
                />
                <Tooltip content={<CustomTooltip />} />
                {EMOTION_CONFIG.filter(e => activeEmotions.includes(e.key)).map(({ key, name, color }) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={name}
                    stroke={color}
                    fill={`url(#gradient-${key})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No timeline data available
            </div>
          )}
        </div>
      </div>

      {/* Additional info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Dominant emotion: <strong className="text-foreground capitalize">{summary.dominant_emotion || 'N/A'}</strong></span>
        <span>{summary.frames_with_faces || 0} / {summary.frames_analyzed || 0} frames with faces</span>
      </div>
    </div>
  );
}

export default EmotionTimeline;
