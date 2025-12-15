import { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../../lib/api';
import { cn } from '../../lib/utils';
import { PREDEFINED_API_KEYS } from './apiKeyConfig';
import {
  Key,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Plus,
  Trash2,
  Shield,
  AlertCircle,
} from 'lucide-react';

// Reusable API Key Item Component
function ApiKeyItem({
  id,
  label,
  description,
  helpUrl,
  helpText,
  value,
  onChange,
  testService,
  testResult,
  onTest,
  isTesting,
  isCustom,
  onDelete,
  Icon,
}) {
  const [showKey, setShowKey] = useState(false);

  const maskKey = (key) => {
    if (!key || key.length < 8) return key;
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  };

  const displayValue = showKey ? value : maskKey(value);

  return (
    <div className="group relative">
      {/* Subtle gradient border on hover */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-fuchsia-500/0 group-hover:from-purple-500/20 group-hover:via-purple-500/10 group-hover:to-fuchsia-500/20 transition-all duration-500 opacity-0 group-hover:opacity-100" />

      <div className="relative p-5 rounded-2xl bg-gradient-to-br from-slate-900/40 to-slate-800/20 border border-white/5 backdrop-blur-sm transition-all duration-300 group-hover:border-white/10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/10 border border-purple-500/20 flex items-center justify-center shadow-lg shadow-purple-500/5">
                <Icon className="w-5 h-5 text-purple-400" />
              </div>
            )}
            {!Icon && isCustom && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-emerald-400" />
              </div>
            )}
            <div>
              <h4 className="font-semibold text-white/90 text-sm tracking-tight">{label}</h4>
              <p className="text-xs text-white/40 mt-0.5">{description}</p>
            </div>
          </div>
          {isCustom && onDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-xl hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all duration-200 opacity-0 group-hover:opacity-100"
              title="Delete custom key"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Input Field */}
        <div className="relative mb-3">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
          <input
            type={showKey ? 'text' : 'password'}
            value={displayValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter your ${label.toLowerCase()}...`}
            className={cn(
              'relative w-full px-4 py-3.5 pr-12 rounded-xl',
              'bg-black/30 border border-white/10',
              'placeholder:text-white/20 text-sm font-mono text-white/80',
              'focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20',
              'transition-all duration-200'
            )}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white/70"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Help Link */}
        {helpUrl && (
          <p className="text-xs text-white/30 mb-4 flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            Get your key at{' '}
            <a
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400/80 hover:text-purple-300 transition-colors inline-flex items-center gap-1 hover:underline underline-offset-2"
            >
              {helpText}
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        )}

        {/* Test Result */}
        {testResult && (
          <div
            className={cn(
              'flex items-center gap-2.5 p-3.5 rounded-xl mb-4 border backdrop-blur-sm',
              'animate-in slide-in-from-top-2 duration-300',
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            )}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{testResult.message}</span>
          </div>
        )}

        {/* Test Button */}
        {testService && onTest && (
          <button
            onClick={onTest}
            disabled={isTesting || !value}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs',
              'bg-white/5 border border-white/10 text-white/70',
              'hover:bg-white/10 hover:border-white/20 hover:text-white/90',
              'transition-all duration-200',
              (isTesting || !value) && 'opacity-40 cursor-not-allowed hover:bg-white/5 hover:border-white/10'
            )}
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
        )}
      </div>
    </div>
  );
}

// Add Custom Key Form
function AddCustomKeyForm({ onAdd }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAdd = () => {
    if (name.trim() && value.trim()) {
      onAdd(name.trim().toLowerCase().replace(/\s+/g, '_'), value);
      setName('');
      setValue('');
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'w-full flex items-center justify-center gap-2 p-4 rounded-2xl',
          'border-2 border-dashed border-white/10 hover:border-purple-500/30',
          'text-white/40 hover:text-purple-400',
          'transition-all duration-300 group'
        )}
      >
        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" />
        <span className="font-medium text-sm">Add Custom API Key</span>
      </button>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/5 to-fuchsia-500/5 border border-purple-500/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h4 className="font-semibold text-white/90 text-sm mb-4 flex items-center gap-2">
        <Plus className="w-4 h-4 text-purple-400" />
        Add Custom API Key
      </h4>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Key Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., anthropic, azure_vision"
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-black/30 border border-white/10',
              'placeholder:text-white/20 text-sm text-white/80',
              'focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20',
              'transition-all duration-200'
            )}
          />
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">API Key Value</label>
          <div className="relative">
            <input
              type={showValue ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter the API key..."
              className={cn(
                'w-full px-4 py-3 pr-12 rounded-xl',
                'bg-black/30 border border-white/10',
                'placeholder:text-white/20 text-sm font-mono text-white/80',
                'focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20',
                'transition-all duration-200'
              )}
            />
            <button
              type="button"
              onClick={() => setShowValue(!showValue)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40"
            >
              {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleAdd}
          disabled={!name.trim() || !value.trim()}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm',
            'bg-purple-500 text-white hover:bg-purple-600',
            'transition-all duration-200',
            (!name.trim() || !value.trim()) && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Plus className="w-4 h-4" />
          Add Key
        </button>
        <button
          onClick={() => {
            setIsOpen(false);
            setName('');
            setValue('');
          }}
          className="px-4 py-2.5 rounded-xl font-medium text-sm text-white/60 hover:text-white/90 hover:bg-white/5 transition-all duration-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Main Component
export function ApiKeyForm() {
  const [apiKeys, setApiKeys] = useState(() => {
    const initial = {};
    PREDEFINED_API_KEYS.forEach((key) => {
      initial[key.id] = '';
    });
    return initial;
  });
  const [customKeys, setCustomKeys] = useState([]);
  const [testResults, setTestResults] = useState({});
  const [testingService, setTestingService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await settingsApi.get();

      const newApiKeys = { ...apiKeys };
      const newCustomKeys = [];

      for (const [key, data] of Object.entries(result.data || {})) {
        const value = typeof data === 'object' ? (data?.value || '') : (data || '');

        // Check if it's a predefined key
        if (PREDEFINED_API_KEYS.some(pk => pk.id === key)) {
          newApiKeys[key] = value;
        }
        // Check if it's a custom key
        else if (key.startsWith('custom_api_key_')) {
          newCustomKeys.push({
            key,
            name: key.replace('custom_api_key_', ''),
            value,
          });
        }
      }

      setApiKeys(newApiKeys);
      setCustomKeys(newCustomKeys);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Combine predefined and custom keys
      const allSettings = { ...apiKeys };
      customKeys.forEach(ck => {
        allSettings[ck.key] = ck.value;
      });

      await settingsApi.update(allSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = useCallback(async (service, keyId) => {
    try {
      setTestingService(service);
      setTestResults(prev => ({ ...prev, [service]: null }));

      const result = await settingsApi.test(service);
      setTestResults(prev => ({
        ...prev,
        [service]: {
          success: result.data.success,
          message: result.data.message,
        },
      }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [service]: {
          success: false,
          message: err.message || 'Test failed',
        },
      }));
    } finally {
      setTestingService(null);
    }
  }, []);

  const handleAddCustomKey = (name, value) => {
    const key = `custom_api_key_${name}`;
    setCustomKeys(prev => [...prev, { key, name, value }]);
    setSaved(false);
  };

  const handleDeleteCustomKey = async (keyToDelete) => {
    try {
      // Try to delete from backend
      await settingsApi.deleteKey(keyToDelete);
    } catch (err) {
      console.error('Failed to delete from backend:', err);
    }
    // Remove from local state regardless
    setCustomKeys(prev => prev.filter(ck => ck.key !== keyToDelete));
    setSaved(false);
  };

  const updateApiKey = (keyId, value) => {
    setApiKeys(prev => ({ ...prev, [keyId]: value }));
    setSaved(false);
    // Clear test result when key changes
    const predefined = PREDEFINED_API_KEYS.find(pk => pk.id === keyId);
    if (predefined) {
      setTestResults(prev => ({ ...prev, [predefined.testService]: null }));
    }
  };

  const updateCustomKey = (key, value) => {
    setCustomKeys(prev => prev.map(ck =>
      ck.key === key ? { ...ck, value } : ck
    ));
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900/50 to-slate-800/30 p-8 flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <span className="text-white/40 text-sm">Loading API keys...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900/50 to-slate-800/30 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-gradient-to-r from-purple-500/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/20 flex items-center justify-center shadow-lg shadow-purple-500/10">
            <Key className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg tracking-tight">API Keys</h3>
            <p className="text-sm text-white/40 mt-0.5">Configure external service credentials securely</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* API Keys List */}
      <div className="p-6 space-y-4">
        {/* Predefined API Keys */}
        {PREDEFINED_API_KEYS.map((keyConfig) => (
          <ApiKeyItem
            key={keyConfig.id}
            id={keyConfig.id}
            label={keyConfig.label}
            description={keyConfig.description}
            helpUrl={keyConfig.helpUrl}
            helpText={keyConfig.helpText}
            value={apiKeys[keyConfig.id] || ''}
            onChange={(value) => updateApiKey(keyConfig.id, value)}
            testService={keyConfig.testService}
            testResult={testResults[keyConfig.testService]}
            onTest={() => handleTest(keyConfig.testService, keyConfig.id)}
            isTesting={testingService === keyConfig.testService}
            Icon={keyConfig.Icon}
          />
        ))}

        {/* Divider */}
        {(customKeys.length > 0 || true) && (
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-xs font-medium text-white/30 bg-[#0c0a1d]">
                Custom API Keys
              </span>
            </div>
          </div>
        )}

        {/* Custom API Keys */}
        {customKeys.map((customKey) => (
          <ApiKeyItem
            key={customKey.key}
            id={customKey.key}
            label={customKey.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            description="Custom API key"
            value={customKey.value}
            onChange={(value) => updateCustomKey(customKey.key, value)}
            isCustom={true}
            onDelete={() => handleDeleteCustomKey(customKey.key)}
          />
        ))}

        {/* Add Custom Key Form */}
        <AddCustomKeyForm onAdd={handleAddCustomKey} />
      </div>

      {/* Save Button */}
      <div className="p-6 border-t border-white/5 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'w-full flex items-center justify-center gap-2.5',
            'px-6 py-4 rounded-xl font-semibold text-sm',
            'transition-all duration-300 transform',
            saved
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02]',
            saving && 'opacity-70 cursor-not-allowed hover:scale-100'
          )}
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? 'Saving...' : saved ? 'All Changes Saved!' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}

export default ApiKeyForm;
