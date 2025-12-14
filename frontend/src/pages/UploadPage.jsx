import { useState, useCallback } from 'react';
import { adsApi } from '../lib/api';
import { useJobProgress } from '../hooks/useJobProgress';
import { useSocket } from '../hooks/useSocket';
import { FileDropzone } from '../components/upload/FileDropzone';
import { UploadProgress } from '../components/upload/UploadProgress';
import { AnalysisResults } from '../components/upload/AnalysisResults';
import { ImprovementSuggestions } from '../components/upload/ImprovementSuggestions';
import { cn } from '../lib/utils';
import { Play, RotateCcw, ArrowRight, Zap } from 'lucide-react';

export function UploadPage() {
  // Socket connection
  useSocket();

  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedAd, setUploadedAd] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Status
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, completed, failed
  const [error, setError] = useState(null);

  // Job progress tracking
  const [jobId, setJobId] = useState(null);
  const {
    progress: analysisProgress,
    step: analysisStep,
    status: jobStatus,
    error: jobError,
    reset: resetJob,
  } = useJobProgress(jobId);

  // Analysis results
  const [analysis, setAnalysis] = useState(null);

  // Handle file selection
  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    setError(null);
    setUploadedAd(null);
    setAnalysis(null);
    setJobId(null);
    resetJob();
    setStatus('idle');
  }, [resetJob]);

  // Handle clear
  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setUploadedAd(null);
    setAnalysis(null);
    setJobId(null);
    setStatus('idle');
    setError(null);
    resetJob();
  }, [resetJob]);

  // Upload and analyze
  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;

    try {
      // Upload phase
      setStatus('uploading');
      setUploadProgress(0);
      setError(null);

      const uploadResult = await adsApi.upload(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      setUploadedAd(uploadResult.data);
      setUploadProgress(100);

      // Start analysis
      setStatus('processing');
      const analyzeResult = await adsApi.analyze(uploadResult.data.id);
      setJobId(analyzeResult.data.jobId);

    } catch (err) {
      setStatus('failed');
      setError(err.message);
    }
  };

  // Effect: Watch job status for completion
  if (jobStatus === 'completed' && status === 'processing') {
    // Fetch the updated ad with analysis
    adsApi.get(uploadedAd.id).then((result) => {
      setAnalysis(result.data);
      setStatus('completed');
    }).catch(console.error);
  }

  if (jobStatus === 'failed' && status === 'processing') {
    setStatus('failed');
    setError(jobError);
  }

  // Reset to start over
  const handleStartOver = () => {
    handleClear();
  };

  const isProcessing = status === 'uploading' || status === 'processing';
  const showResults = status === 'completed' && analysis;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-display font-bold text-foreground">
          Analyze Advertisement
        </h1>
        <p className="text-muted-foreground">
          Upload an image or video ad to get AI-powered effectiveness analysis and improvement suggestions.
        </p>
      </div>

      {/* Main content */}
      <div className="space-y-6">
        {/* File Dropzone - show when no results */}
        {!showResults && (
          <FileDropzone
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            onClear={handleClear}
            disabled={isProcessing}
          />
        )}

        {/* Upload/Analysis Progress */}
        {(status === 'uploading' || status === 'processing' || status === 'failed') && (
          <UploadProgress
            status={status}
            uploadProgress={uploadProgress}
            progress={analysisProgress}
            step={analysisStep}
            error={error || jobError}
          />
        )}

        {/* Action Button - Upload & Analyze */}
        {selectedFile && !isProcessing && !showResults && (
          <button
            onClick={handleUploadAndAnalyze}
            className={cn(
              'w-full flex items-center justify-center gap-3',
              'px-6 py-4 rounded-xl font-display font-semibold text-lg',
              'bg-gradient-to-r from-purple-600 to-purple-500',
              'text-white shadow-lg shadow-purple-500/25',
              'hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02]',
              'active:scale-[0.98]',
              'transition-all duration-200 ease-out',
              'animate-pulse-glow'
            )}
          >
            <Zap className="w-5 h-5" />
            Upload & Analyze
            <ArrowRight className="w-5 h-5" />
          </button>
        )}

        {/* Results Section */}
        {showResults && (
          <div className="space-y-8">
            {/* Start Over button */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-display font-semibold text-foreground">
                  Analysis Results
                </h2>
                <p className="text-sm text-muted-foreground">
                  {uploadedAd?.original_filename}
                </p>
              </div>
              <button
                onClick={handleStartOver}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Analyze Another
              </button>
            </div>

            {/* Analysis Results Component */}
            <AnalysisResults analysis={analysis} />

            {/* Improvement Suggestions */}
            <ImprovementSuggestions suggestions={analysis?.improvement_suggestions} />

            {/* Next Steps CTA */}
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-display font-semibold text-foreground">
                    Ready to Collect Emotional Data?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Upload viewer reaction videos to analyze emotional responses.
                  </p>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors">
                  Go to Train Tab
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadPage;
