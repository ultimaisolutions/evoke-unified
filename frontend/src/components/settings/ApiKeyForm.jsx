import { useState, useEffect } from 'react';
import { settingsApi } from '../../lib/api';
import { cn } from '../../lib/utils';
import { Key, Eye, EyeOff, Save, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export function ApiKeyForm() {
  const [settings, setSettings] = useState({
    hume_api_key: '',
  });
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await settingsApi.get();
      setSettings({
        hume_api_key: result.data.hume_api_key || '',
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsApi.update(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const result = await settingsApi.test('hume');
      setTestResult({
        success: result.data.valid,
        message: result.data.valid ? 'API key is valid!' : result.data.error || 'Invalid API key',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const maskKey = (key) => {
    if (!key || key.length < 8) return key;
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Key className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">API Keys</h3>
          <p className="text-sm text-muted-foreground">Configure external service credentials</p>
        </div>
      </div>

      {/* Hume AI Key */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Hume AI API Key
        </label>
        <p className="text-xs text-muted-foreground">
          Required for emotion analysis. Get your key at{' '}
          <a
            href="https://platform.hume.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:underline"
          >
            platform.hume.ai
          </a>
        </p>

        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={showKey ? settings.hume_api_key : maskKey(settings.hume_api_key)}
            onChange={(e) => {
              setSettings(prev => ({ ...prev, hume_api_key: e.target.value }));
              setSaved(false);
              setTestResult(null);
            }}
            placeholder="Enter your Hume AI API key..."
            className={cn(
              'w-full px-4 py-3 pr-24 rounded-xl border border-border bg-card/50',
              'placeholder:text-muted-foreground text-sm font-mono',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/50'
            )}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={cn(
            'flex items-center gap-2 p-3 rounded-lg',
            testResult.success
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          )}>
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={testing || !settings.hume_api_key}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm',
              'border border-border bg-card/50',
              'hover:bg-card transition-colors',
              (testing || !settings.hume_api_key) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Test Connection
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'flex-1 flex items-center justify-center gap-2',
              'px-4 py-2 rounded-xl font-medium text-sm',
              'transition-all duration-200',
              saved
                ? 'bg-emerald-500 text-white'
                : 'bg-purple-500 text-white hover:bg-purple-600',
              saving && 'opacity-50 cursor-not-allowed'
            )}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApiKeyForm;
