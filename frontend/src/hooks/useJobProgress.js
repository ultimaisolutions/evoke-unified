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

  useEffect(() => {
    if (!jobId) {
      setStatus('idle');
      setProgress(0);
      setStep('');
      return;
    }

    setStatus('processing');
    setProgress(0);
    setStep('Starting...');

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
  }, []);

  return {
    progress,
    step,
    status,
    error,
    result,
    isProcessing: status === 'processing',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
    reset,
  };
}

export default useJobProgress;
