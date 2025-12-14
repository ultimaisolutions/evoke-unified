import { useState } from 'react';
import { cn } from '../../lib/utils';
import {
  Lightbulb, ChevronDown, AlertCircle, AlertTriangle, Info,
  Sun, Palette, LayoutGrid, Activity, Film, Users, Sparkles
} from 'lucide-react';

const PRIORITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'Critical',
  },
  high: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    label: 'High Priority',
  },
  medium: {
    icon: Lightbulb,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    label: 'Medium',
  },
  low: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    label: 'Low',
  },
  info: {
    icon: Sparkles,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    label: 'Info',
  },
};

const CATEGORY_ICONS = {
  lighting: Sun,
  contrast: Sun,
  color: Palette,
  composition: LayoutGrid,
  motion: Activity,
  pacing: Film,
  content: Users,
  overall: Sparkles,
};

function SuggestionItem({ suggestion, isExpanded, onToggle }) {
  const priority = PRIORITY_CONFIG[suggestion.priority] || PRIORITY_CONFIG.medium;
  const PriorityIcon = priority.icon;
  const CategoryIcon = CATEGORY_ICONS[suggestion.category] || Lightbulb;

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-300',
      priority.border,
      isExpanded ? priority.bg : 'bg-card/30 hover:bg-card/50'
    )}>
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-start gap-4 text-left"
      >
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
          priority.bg
        )}>
          <PriorityIcon className={cn('w-4 h-4', priority.color)} />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-2 py-0.5 rounded-md text-xs font-medium capitalize',
              priority.bg, priority.color
            )}>
              {suggestion.category}
            </span>
            <span className="text-xs text-muted-foreground">
              {priority.label}
            </span>
          </div>
          <p className={cn(
            'text-sm leading-relaxed',
            isExpanded ? 'text-foreground' : 'text-foreground/80 line-clamp-2'
          )}>
            {suggestion.suggestion}
          </p>
        </div>

        <ChevronDown className={cn(
          'w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200',
          isExpanded && 'rotate-180'
        )} />
      </button>

      {/* Expanded details */}
      {isExpanded && suggestion.metric && (
        <div className="px-5 pb-4 pl-[4.5rem]">
          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current Value:</span>
                <span className="ml-2 font-medium text-foreground">
                  {suggestion.current_value}
                </span>
              </div>
              {suggestion.recommended_range && (
                <div>
                  <span className="text-muted-foreground">Recommended:</span>
                  <span className="ml-2 font-medium text-foreground">
                    {suggestion.recommended_range[0]} - {suggestion.recommended_range[1]}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ImprovementSuggestions({ suggestions }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-foreground">Looking Great!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          No major improvements needed for this ad.
        </p>
      </div>
    );
  }

  // Group by priority
  const criticalAndHigh = suggestions.filter(s =>
    s.priority === 'critical' || s.priority === 'high'
  );
  const others = suggestions.filter(s =>
    s.priority !== 'critical' && s.priority !== 'high'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">
              Improvement Suggestions
            </h3>
            <p className="text-sm text-muted-foreground">
              {suggestions.length} suggestions based on AI analysis
            </p>
          </div>
        </div>

        {criticalAndHigh.length > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
            {criticalAndHigh.length} high priority
          </span>
        )}
      </div>

      {/* Critical and High Priority */}
      {criticalAndHigh.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Priority Items
          </h4>
          {criticalAndHigh.map((suggestion, index) => (
            <SuggestionItem
              key={index}
              suggestion={suggestion}
              isExpanded={expandedIndex === index}
              onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
            />
          ))}
        </div>
      )}

      {/* Other suggestions */}
      {others.length > 0 && (
        <div className="space-y-3">
          {criticalAndHigh.length > 0 && (
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Additional Suggestions
            </h4>
          )}
          {others.map((suggestion, index) => {
            const actualIndex = criticalAndHigh.length + index;
            return (
              <SuggestionItem
                key={actualIndex}
                suggestion={suggestion}
                isExpanded={expandedIndex === actualIndex}
                onToggle={() => setExpandedIndex(expandedIndex === actualIndex ? null : actualIndex)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ImprovementSuggestions;
