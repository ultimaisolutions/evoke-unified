import { useState } from 'react';
import { trainingApi } from '../../lib/api';
import { cn } from '../../lib/utils';
import { Download, FileJson, Loader2, Eye, X, Copy, Check, AlertCircle } from 'lucide-react';

export function JsonlExport() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await trainingApi.export();

      // Create and download file
      const blob = new Blob([result.data.jsonl], { type: 'application/jsonl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.data.filename || 'training_data.jsonl';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await trainingApi.export();
      setPreview(result.data);
      setShowPreview(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!preview?.jsonl) return;

    try {
      await navigator.clipboard.writeText(preview.jsonl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatPreview = () => {
    if (!preview?.jsonl) return [];
    return preview.jsonl.split('\n').filter(line => line.trim());
  };

  return (
    <>
      <div className="rounded-xl border border-border/50 bg-card/30 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <FileJson className="w-5 h-5 text-purple-400" />
          <h3 className="font-medium text-foreground">Export Training Data</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Export your training data in JSONL format compatible with OpenAI's fine-tuning API.
          Each entry includes ad analysis, emotion data, and human ratings.
        </p>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={loading}
            className={cn(
              'flex-1 flex items-center justify-center gap-2',
              'px-4 py-2.5 rounded-xl font-medium',
              'bg-purple-500 text-white',
              'hover:bg-purple-600 transition-colors',
              loading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download JSONL
          </button>

          <button
            onClick={handlePreview}
            disabled={loading}
            className={cn(
              'flex items-center gap-2',
              'px-4 py-2.5 rounded-xl font-medium',
              'border border-border bg-card/50',
              'hover:bg-card transition-colors',
              loading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Format structure:</p>
          <code className="block p-2 rounded bg-muted/50 text-[10px] overflow-x-auto">
            {`{"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}`}
          </code>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-4xl max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <FileJson className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-medium text-foreground">JSONL Preview</h3>
                  <p className="text-xs text-muted-foreground">
                    {preview.count} entries • {(preview.jsonl?.length / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
                    'border border-border hover:bg-muted transition-colors',
                    copied && 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-auto max-h-[calc(80vh-100px)]">
              {formatPreview().length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileJson className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>No training data to export</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {formatPreview().map((line, index) => {
                    let parsed;
                    try {
                      parsed = JSON.parse(line);
                    } catch {
                      parsed = null;
                    }

                    return (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-purple-400">
                            Entry {index + 1}
                          </span>
                        </div>
                        {parsed ? (
                          <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(parsed, null, 2)}
                          </pre>
                        ) : (
                          <code className="text-xs text-muted-foreground break-all">
                            {line}
                          </code>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default JsonlExport;
