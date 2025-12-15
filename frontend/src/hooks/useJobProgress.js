import { useState, useEffect, useCallback } from 'react';
import { subscribeToJob } from '../lib/socket';
import { jobsApi } from '../lib/api';

/**
 * Hook for tracking job progress via WebSocket
 */
export function useJobProgress(jobId) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [status, setStatus] = useState('idle'); // idle, processing, completed, failed
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [frameResults, setFrameResults] = useState([]);

  useEffect(() => {
    if (!jobId) {
      setStatus('idle');
      setProgress(0);
      setStep('');
      setFrameResults([]);
      return;
    }

    setStatus('processing');
    setProgress(0);
    setStep('Starting...');
    setFrameResults([]);

    const unsubscribe = subscribeToJob(jobId, {
      onProgress: (data) => {
        setProgress(data.progress || 0);
        setStep(data.step || '');
      },
      onCompleted: (data) => {
        setStatus('completed');
        setProgress(100);
        setStep('Complete');
        setResult(data.result || null);
      },
      onError: (data) => {
        setStatus('failed');
        setError(data.error || 'Unknown error');
        setStep('Failed');
      },
      onFrame: (data) => {
        // Real-time frame result from streaming analysis
        if (data.frame) {
          setFrameResults(prev => [...prev, data.frame]);
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [jobId]);

  const reset = useCallback(() => {
    setProgress(0);
    setStep('');
    setStatus('idle');
    setError(null);
    setResult(null);
    setFrameResults([]);
  }, []);

  return {
    progress,
    step,
    status,
    error,
    result,
    frameResults,
    isProcessing: status === 'processing',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
    reset,
  };
}

export default useJobProgress;
