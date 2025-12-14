import { cn, getScoreClass, getScoreLabel } from '../../lib/utils';
import {
  Eye, Sparkles, Target, TrendingUp, Users, Palette, Sun, Contrast,
  LayoutGrid, Activity, Film, ChevronRight
} from 'lucide-react';

function ScoreCard({ icon: Icon, label, score, description }) {
  const scoreClass = getScoreClass(score);
  const scoreLabel = getScoreLabel(score);

  return (
    <div className="group relative rounded-xl border border-border/50 bg-card/50 p-5 hover:bg-card/80 transition-all duration-300 hover:border-purple-500/30">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-purple-400" />
            </div>
            <span className="font-medium text-foreground">{label}</span>
          </div>
          <span className={cn(
            'px-2.5 py-0.5 rounded-full text-xs font-medium border',
            scoreClass
          )}>
            {scoreLabel}
          </span>
        </div>

        {/* Score display */}
        <div className="flex items-end gap-2">
          <span className="text-4xl font-display font-bold text-foreground">
            {Math.round(score)}
          </span>
          <span className="text-lg text-muted-foreground mb-1">/100</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              score >= 80 && 'bg-emerald-500',
              score >= 60 && score < 80 && 'bg-purple-500',
              score >= 40 && score < 60 && 'bg-amber-500',
              score < 40 && 'bg-red-500'
            )}
            style={{ width: `${score}%` }}
          />
        </div>

        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

function MetricItem({ icon: Icon, label, value, unit = '' }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground">
        {typeof value === 'number' ? value.toFixed(2) : value}{unit}
      </span>
    </div>
  );
}

function ColorPalette({ colors }) {
  if (!colors || colors.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
        <Palette className="w-4 h-4 text-purple-400" />
        Dominant Colors
      </h4>
      <div className="flex gap-2">
        {colors.slice(0, 5).map((color, i) => (
          <div key={i} className="group relative">
            <div
              className="w-12 h-12 rounded-lg border border-white/10 shadow-lg transition-transform hover:scale-110"
              style={{ backgroundColor: color.hex }}
            />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {Math.round(color.percentage * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetectedObjects({ objects }) {
  if (!objects || objects.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
        <Eye className="w-4 h-4 text-purple-400" />
        Detected Objects
      </h4>
      <div className="flex flex-wrap gap-2">
        {objects.slice(0, 10).map((obj, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm"
          >
            <span className="text-foreground capitalize">{obj.class}</span>
            <span className="text-xs text-muted-foreground">
              {Math.round(obj.confidence * 100)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function AnalysisResults({ analysis }) {
  if (!analysis) return null;

  const {
    overall_score = 0,
    visual_appeal_score = 0,
    clarity_score = 0,
    attention_grab_score = 0,
    detected_objects = [],
    dominant_colors = [],
    brightness_avg = 0,
    contrast_avg = 0,
    saturation_avg = 0,
    motion_score = 0,
    scene_changes = 0,
    rule_of_thirds_score = 0,
    visual_balance_score = 0,
    person_count = 0,
  } = analysis;

  const hasVideo = motion_score > 0 || scene_changes > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overall Score - Hero Card */}
      <div className="relative rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-8 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-display font-semibold text-foreground">
                Overall Effectiveness
              </h3>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Combined score based on visual appeal, clarity, and attention-grabbing potential.
            </p>
          </div>

          <div className="text-right">
            <div className="text-6xl font-display font-bold text-gradient">
              {Math.round(overall_score)}
            </div>
            <span className={cn(
              'inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium border',
              getScoreClass(overall_score)
            )}>
              {getScoreLabel(overall_score)}
            </span>
          </div>
        </div>
      </div>

      {/* Score Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScoreCard
          icon={Sparkles}
          label="Visual Appeal"
          score={visual_appeal_score}
          description="Color vibrancy and visual interest"
        />
        <ScoreCard
          icon={Eye}
          label="Clarity"
          score={clarity_score}
          description="Message readability and contrast"
        />
        <ScoreCard
          icon={Target}
          label="Attention Grab"
          score={attention_grab_score}
          description="Ability to capture viewer attention"
        />
      </div>

      {/* Detected Objects & Colors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-4">
          <DetectedObjects objects={detected_objects} />
          {person_count > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-muted-foreground">People detected:</span>
              <span className="font-medium text-foreground">{person_count} frames</span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/50 bg-card/30 p-5">
          <ColorPalette colors={dominant_colors} />
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="rounded-xl border border-border/50 bg-card/30 p-5">
        <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          Visual Metrics
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 divide-y md:divide-y-0 divide-border/50">
          <div className="space-y-1">
            <MetricItem icon={Sun} label="Brightness" value={brightness_avg} />
            <MetricItem icon={Contrast} label="Contrast" value={contrast_avg} />
            <MetricItem icon={Palette} label="Saturation" value={saturation_avg} />
          </div>

          <div className="space-y-1 pt-4 md:pt-0">
            <MetricItem icon={LayoutGrid} label="Rule of Thirds" value={rule_of_thirds_score} />
            <MetricItem icon={LayoutGrid} label="Visual Balance" value={visual_balance_score} />
          </div>

          {hasVideo && (
            <div className="space-y-1 pt-4 lg:pt-0">
              <MetricItem icon={Activity} label="Motion Score" value={motion_score} />
              <MetricItem icon={Film} label="Scene Changes" value={scene_changes} unit=" cuts" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalysisResults;
