import { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { reactionsApi } from '../../lib/api';
import { useJobProgress } from '../../hooks/useJobProgress';
import { cn, formatFileSize } from '../../lib/utils';
import { Video, Upload, Loader2, CheckCircle2, XCircle, Play } from 'lucide-react';

export function ReactionUpload({ selectedAd, onAnalysisComplete, onFrameResultsUpdate }) {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, completed, failed
  const [reaction, setReaction] = useState(null);
  const [error, setError] = useState(null);

  const [jobId, setJobId] = useState(null);
  const { progress, step, status: jobStatus, error: jobError, frameResults } = useJobProgress(jobId);

  // Notify parent of frame results for real-time timeline updates
  useEffect(() => {
    if (frameResults.length > 0 && onFrameResultsUpdate) {
      onFrameResultsUpdate(frameResults);
    }
  }, [frameResults, onFrameResultsUpdate]);

  // Prevent duplicate completion handling
  const completionHandledRef = useRef(false);

  const onDrop = useCallback((acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setStatus('idle');
      completionHandledRef.current = false;
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/webm': ['.webm'],
    },
    maxFiles: 1,
    disabled: !selectedAd || status === 'uploading' || status === 'processing',
  });

  const handleUploadAndAnalyze = async () => {
    if (!file || !selectedAd) return;

    try {
      // Reset completion flag
      completionHandledRef.current = false;

      // Upload
      setStatus('uploading');
      setUploadProgress(0);
      setError(null);

      const uploadResult = await reactionsApi.upload(selectedAd.id, file, (progress) => {
        setUploadProgress(progress);
      });

      setReaction(uploadResult.data);
      setUploadProgress(100);

      // Start analysis
      setStatus('processing');
      const analyzeResult = await reactionsApi.analyze(uploadResult.data.id);
      setJobId(analyzeResult.data.jobId);

    } catch (err) {
      setStatus('failed');
      setError(err.message);
    }
  };

  // Watch for job completion - properly in useEffect
  useEffect(() => {
    if (jobStatus === 'completed' && status === 'processing' && reaction && !completionHandledRef.current) {
      completionHandledRef.current = true;

      reactionsApi.get(reaction.id)
        .then((result) => {
          setStatus('completed');
          onAnalysisComplete?.(result.data);
        })
        .catch((err) => {
          setStatus('failed');
          setError(err.message || 'Failed to retrieve analysis results');
        });
    }

    if (jobStatus === 'failed' && status === 'processing' && !completionHandledRef.current) {
      completionHandledRef.current = true;
      setStatus('failed');
      setError(jobError || 'Analysis failed');
    }
  }, [jobStatus, status, reaction, jobError, onAnalysisComplete]);

  const isDisabled = !selectedAd;
  const isProcessing = status === 'uploading' || status === 'processing';

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-muted-foreground">
        Upload Reaction Video
      </label>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 transition-all duration-200',
          'flex flex-col items-center justify-center text-center',
          'min-h-[180px]',
          isDisabled && 'opacity-50 cursor-not-allowed',
          !isDisabled && 'cursor-pointer',
          isDragActive && 'border-purple-500 bg-purple-500/10',
          !isDragActive && !file && 'border-border hover:border-purple-500/50',
          file && 'border-purple-500/50 bg-purple-500/5'
        )}
      >
        <input {...getInputProps()} />

        {file ? (
          <div className="space-y-2">
            <div className="w-12 h-12 mx-auto rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Video className="w-6 h-6 text-purple-400" />
            </div>
            <p className="font-medium text-foreground">{file.name}</p>
            <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className={cn(
              'w-12 h-12 mx-auto rounded-xl flex items-center justify-center',
              isDisabled ? 'bg-muted' : 'bg-purple-500/20'
            )}>
              <Upload className={cn(
                'w-6 h-6',
                isDisabled ? 'text-muted-foreground' : 'text-purple-400'
              )} />
            </div>
            <p className="text-sm text-muted-foreground">
              {isDisabled
                ? 'Select an ad first'
                : 'Drop reaction video here or click to browse'
              }
            </p>
            <p className="text-xs text-muted-foreground">
              MP4, MOV, WebM supported
            </p>
          </div>
        )}
      </div>

      {/* Progress */}
      {isProcessing && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">
                {status === 'uploading' ? 'Uploading...' : 'Analyzing emotions...'}
              </p>
              <p className="text-xs text-muted-foreground">
                {status === 'uploading' ? `${uploadProgress}%` : step}
              </p>
            </div>
            <span className="text-lg font-bold text-purple-400">
              {status === 'uploading' ? uploadProgress : progress}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${status === 'uploading' ? uploadProgress : progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success */}
      {status === 'completed' && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="font-medium text-foreground text-sm">Analysis Complete</p>
            <p className="text-xs text-muted-foreground">Emotional data ready for review</p>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'failed' && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400" />
          <div>
            <p className="font-medium text-foreground text-sm">Analysis Failed</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* Action button */}
      {file && !isProcessing && status !== 'completed' && (
        <button
          onClick={handleUploadAndAnalyze}
          className={cn(
            'w-full flex items-center justify-center gap-2',
            'px-4 py-3 rounded-xl font-medium',
            'bg-purple-500 text-white',
            'hover:bg-purple-600 transition-colors'
          )}
        >
          <Play className="w-4 h-4" />
          Upload & Analyze Emotions
        </button>
      )}
    </div>
  );
}

export default ReactionUpload;
