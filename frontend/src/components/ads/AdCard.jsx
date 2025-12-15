import { Image, Film, TrendingUp, Sparkles, Eye, Target, Calendar } from 'lucide-react';
import { cn, getScoreClass, getScoreLabel } from '../../lib/utils';

function ScoreMini({ icon: Icon, label, score }) {
  const value = Math.round(score || 0);
  return (
    <div className="text-center p-2 rounded-lg bg-muted/30">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
      <div className="text-sm font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

export function AdCard({ ad, onSelect }) {
  const isVideo = ad.file_type === 'video';

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <button
      onClick={() => onSelect(ad.id)}
      className={cn(
        'group relative w-full text-left',
        'rounded-xl border border-border/50 bg-card/30',
        'hover:bg-card/60 hover:border-purple-500/30',
        'transition-all duration-300',
        'overflow-hidden'
      )}
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Media type indicator */}
      <div className="absolute top-3 left-3 z-10">
        <div className={cn(
          'px-2 py-1 rounded-lg text-xs font-medium',
          'bg-background/80 backdrop-blur-sm border border-border/50',
          'flex items-center gap-1'
        )}>
          {isVideo ? <Film className="w-3 h-3" /> : <Image className="w-3 h-3" />}
          <span className="capitalize">{ad.file_type}</span>
        </div>
      </div>

      {/* Overall score badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className={cn(
          'px-2.5 py-1 rounded-lg text-sm font-bold border',
          getScoreClass(ad.overall_score || 0)
        )}>
          {Math.round(ad.overall_score || 0)}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 pt-14 space-y-4 relative">
        {/* Filename */}
        <div>
          <h3 className="font-medium text-foreground truncate group-hover:text-purple-400 transition-colors">
            {ad.original_filename}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {formatDate(ad.created_at)}
          </div>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <ScoreMini icon={Sparkles} label="Visual" score={ad.visual_appeal_score} />
          <ScoreMini icon={Eye} label="Clarity" score={ad.clarity_score} />
          <ScoreMini icon={Target} label="Attention" score={ad.attention_grab_score} />
        </div>

        {/* Overall rating label */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-muted-foreground">Overall</span>
          </div>
          <span className={cn(
            'text-sm font-medium',
            ad.overall_score >= 70 ? 'text-emerald-400' :
            ad.overall_score >= 50 ? 'text-purple-400' :
            ad.overall_score >= 30 ? 'text-amber-400' : 'text-red-400'
          )}>
            {getScoreLabel(ad.overall_score || 0)}
          </span>
        </div>
      </div>
    </button>
  );
}

export default AdCard;
