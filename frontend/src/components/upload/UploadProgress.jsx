import { cn } from '../../lib/utils';
import { Loader2, CheckCircle2, XCircle, Sparkles } from 'lucide-react';

export function UploadProgress({
  progress = 0,
  step = '',
  status = 'idle', // idle, uploading, processing, completed, failed
  uploadProgress = 0,
  error = null,
}) {
  const isUploading = status === 'uploading';
  const isProcessing = status === 'processing';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isActive = isUploading || isProcessing;

  const displayProgress = isUploading ? uploadProgress : progress;

  if (status === 'idle') return null;

  return (
    <div className={cn(
      'rounded-2xl border p-6 transition-all duration-500 animate-fade-in',
      isCompleted && 'border-emerald-500/30 bg-emerald-500/5',
      isFailed && 'border-red-500/30 bg-red-500/5',
      isActive && 'border-purple-500/30 bg-purple-500/5'
    )}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          {isActive && (
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
          )}
          {isCompleted && (
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          )}
          {isFailed && (
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-foreground">
              {isUploading && 'Uploading...'}
              {isProcessing && 'Analyzing Ad'}
              {isCompleted && 'Analysis Complete'}
              {isFailed && 'Analysis Failed'}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {isActive && step}
              {isCompleted && 'Your ad has been analyzed successfully'}
              {isFailed && error}
            </p>
          </div>

          {isActive && (
            <span className="text-2xl font-display font-bold text-purple-400">
              {displayProgress}%
            </span>
          )}
        </div>

        {/* Progress bar */}
        {isActive && (
          <div className="relative">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            {/* Animated glow */}
            <div
              className="absolute top-0 h-2 bg-purple-400/50 rounded-full blur-sm transition-all duration-300"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        )}

        {/* Processing steps indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>AI-powered analysis in progress</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadProgress;
