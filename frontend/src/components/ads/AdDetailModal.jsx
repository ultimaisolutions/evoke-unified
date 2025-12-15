import { useEffect, useRef } from 'react';
import { X, Image, Film, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { AnalysisResults } from '../upload/AnalysisResults';
import { ImprovementSuggestions } from '../upload/ImprovementSuggestions';
import { cn, getScoreLabel } from '../../lib/utils';

export function AdDetailModal({ ad, loading, onClose }) {
  const panelRef = useRef(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Focus trap
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.focus();
    }
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop with blur */}
      <div
        className={cn(
          'absolute inset-0 bg-background/70 backdrop-blur-md',
          'animate-in fade-in duration-300'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 right-0 w-full max-w-4xl',
          'bg-background/95 backdrop-blur-xl',
          'border-l border-purple-500/20',
          'shadow-2xl shadow-purple-500/10',
          'overflow-hidden',
          'animate-in slide-in-from-right duration-500 ease-out',
          'focus:outline-none'
        )}
      >
        {/* Decorative gradient orb */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-20 w-60 h-60 bg-purple-600/5 rounded-full blur-2xl pointer-events-none" />

        {/* Scrollable content */}
        <div className="relative h-full overflow-y-auto">
          {/* Sticky Header */}
          <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/50">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center animate-pulse">
                      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-5 w-48 bg-muted/50 rounded-lg animate-pulse" />
                      <div className="h-3 w-32 bg-muted/30 rounded animate-pulse" />
                    </div>
                  </div>
                ) : ad ? (
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Media type icon with glow */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-purple-500/20 rounded-xl blur-lg" />
                      <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 flex items-center justify-center">
                        {ad.file_type === 'video' ? (
                          <Film className="w-6 h-6 text-purple-400" />
                        ) : (
                          <Image className="w-6 h-6 text-purple-400" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h2 className="font-display font-bold text-lg text-foreground truncate">
                        {ad.original_filename}
                      </h2>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="capitalize">{ad.file_type}</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                        <span>{formatDate(ad.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Close button */}
                <button
                  onClick={onClose}
                  className={cn(
                    'p-2.5 rounded-xl',
                    'bg-muted/50 hover:bg-muted border border-border/50',
                    'text-muted-foreground hover:text-foreground',
                    'transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-purple-500/50'
                  )}
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Score summary bar */}
              {!loading && ad && (
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-1000 ease-out',
                        ad.overall_score >= 80 && 'bg-gradient-to-r from-emerald-500 to-emerald-400',
                        ad.overall_score >= 60 && ad.overall_score < 80 && 'bg-gradient-to-r from-purple-500 to-purple-400',
                        ad.overall_score >= 40 && ad.overall_score < 60 && 'bg-gradient-to-r from-amber-500 to-amber-400',
                        ad.overall_score < 40 && 'bg-gradient-to-r from-red-500 to-red-400'
                      )}
                      style={{ width: `${ad.overall_score || 0}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-display font-bold text-foreground">
                      {Math.round(ad.overall_score || 0)}
                    </span>
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Content */}
          <div className="relative px-6 py-8 space-y-10">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                </div>
                <p className="text-muted-foreground animate-pulse">Loading analysis data...</p>
              </div>
            ) : ad ? (
              <>
                {/* Analysis Results Section */}
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                  <AnalysisResults analysis={ad} />
                </section>

                {/* Improvement Suggestions Section */}
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                  <ImprovementSuggestions suggestions={ad.improvement_suggestions} />
                </section>

                {/* Quick Actions */}
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                  <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-border/50">
                    <button className={cn(
                      'group flex items-center gap-2 px-5 py-2.5 rounded-xl',
                      'bg-gradient-to-r from-purple-500 to-purple-600',
                      'text-white font-medium',
                      'shadow-lg shadow-purple-500/25',
                      'hover:shadow-xl hover:shadow-purple-500/30',
                      'hover:from-purple-400 hover:to-purple-500',
                      'transition-all duration-300',
                      'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-background'
                    )}>
                      <Sparkles className="w-4 h-4" />
                      Use for Training
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      onClick={onClose}
                      className={cn(
                        'px-5 py-2.5 rounded-xl',
                        'bg-muted/50 hover:bg-muted',
                        'text-foreground font-medium',
                        'border border-border/50',
                        'transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-purple-500/50'
                      )}
                    >
                      Close
                    </button>
                  </div>
                </section>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                  <X className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">Failed to Load</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Could not load the analysis data. Please try again.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdDetailModal;
