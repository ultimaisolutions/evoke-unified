import { useState, useEffect } from 'react';
import { settingsApi } from '../../lib/api';
import { cn } from '../../lib/utils';
import {
  Settings2, Save, Loader2, CheckCircle2, Video, Image,
  Gauge, Palette, RefreshCw
} from 'lucide-react';

const DETECTION_MODELS = [
  { value: 'yolov5s', label: 'YOLOv5 Small', description: 'Fast, less accurate' },
  { value: 'yolov5m', label: 'YOLOv5 Medium', description: 'Balanced' },
  { value: 'yolov5l', label: 'YOLOv5 Large', description: 'Slower, more accurate' },
];

const FRAME_RATES = [
  { value: 1, label: '1 fps', description: 'Fastest processing' },
  { value: 2, label: '2 fps', description: 'Balanced' },
  { value: 5, label: '5 fps', description: 'More detail' },
  { value: 10, label: '10 fps', description: 'High detail' },
];

function SettingRow({ icon: Icon, label, description, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border/50 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mt-0.5">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0">
        {children}
      </div>
    </div>
  );
}

function SelectDropdown({ value, options, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'px-3 py-2 rounded-lg border border-border bg-card/50',
        'text-sm text-foreground',
        'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
        'appearance-none cursor-pointer min-w-[140px]'
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'w-12 h-6 rounded-full transition-colors duration-200 relative',
        checked ? 'bg-purple-500' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-7' : 'translate-x-1'
        )}
      />
    </button>
  );
}

export function GeneralSettings() {
  const [settings, setSettings] = useState({
    detection_model: 'yolov5s',
    frame_rate: 2,
    enable_colors: true,
    enable_composition: true,
    enable_motion: true,
    max_video_duration: 60,
    confidence_threshold: 0.5,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await settingsApi.get();
      setSettings(prev => ({
        ...prev,
        detection_model: result.data.detection_model || 'yolov5s',
        frame_rate: result.data.frame_rate || 2,
        enable_colors: result.data.enable_colors !== false,
        enable_composition: result.data.enable_composition !== false,
        enable_motion: result.data.enable_motion !== false,
        max_video_duration: result.data.max_video_duration || 60,
        confidence_threshold: result.data.confidence_threshold || 0.5,
      }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
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

  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Analysis Settings</h3>
            <p className="text-sm text-muted-foreground">Configure how ads are analyzed</p>
          </div>
        </div>

        <button
          onClick={loadSettings}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-border/50">
        <SettingRow
          icon={Video}
          label="Detection Model"
          description="Object detection model for YOLO analysis"
        >
          <SelectDropdown
            value={settings.detection_model}
            options={DETECTION_MODELS}
            onChange={(v) => handleChange('detection_model', v)}
          />
        </SettingRow>

        <SettingRow
          icon={Gauge}
          label="Video Frame Rate"
          description="Frames per second to analyze in videos"
        >
          <SelectDropdown
            value={settings.frame_rate}
            options={FRAME_RATES}
            onChange={(v) => handleChange('frame_rate', parseInt(v))}
          />
        </SettingRow>

        <SettingRow
          icon={Palette}
          label="Color Analysis"
          description="Extract dominant colors and palette"
        >
          <Toggle
            checked={settings.enable_colors}
            onChange={(v) => handleChange('enable_colors', v)}
          />
        </SettingRow>

        <SettingRow
          icon={Image}
          label="Composition Analysis"
          description="Analyze visual composition and layout"
        >
          <Toggle
            checked={settings.enable_composition}
            onChange={(v) => handleChange('enable_composition', v)}
          />
        </SettingRow>

        <SettingRow
          icon={Video}
          label="Motion Analysis"
          description="Detect motion patterns in videos"
        >
          <Toggle
            checked={settings.enable_motion}
            onChange={(v) => handleChange('enable_motion', v)}
          />
        </SettingRow>

        <SettingRow
          icon={Gauge}
          label="Confidence Threshold"
          description="Minimum confidence for object detection"
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.1"
              value={settings.confidence_threshold}
              onChange={(e) => handleChange('confidence_threshold', parseFloat(e.target.value))}
              className="w-24 h-2 bg-muted rounded-full appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                         [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <span className="text-sm font-mono text-foreground min-w-[40px]">
              {settings.confidence_threshold.toFixed(1)}
            </span>
          </div>
        </SettingRow>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          'w-full flex items-center justify-center gap-2',
          'px-4 py-3 rounded-xl font-medium',
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
        {saved ? 'Settings Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}

export default GeneralSettings;
