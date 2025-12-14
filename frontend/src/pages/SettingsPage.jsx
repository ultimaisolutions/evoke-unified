import { ApiKeyForm } from '../components/settings/ApiKeyForm';
import { GeneralSettings } from '../components/settings/GeneralSettings';
import { SystemStatus } from '../components/settings/SystemStatus';
import { Settings, Info } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Settings className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure API keys, analysis options, and system preferences
          </p>
        </div>
      </div>

      {/* Settings grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <ApiKeyForm />
          <GeneralSettings />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <SystemStatus />

          {/* Info card */}
          <div className="rounded-xl border border-border/50 bg-card/30 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">About</h3>
                <p className="text-sm text-muted-foreground">Application information</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Version</span>
                <span className="text-foreground font-mono">1.0.0-beta</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Environment</span>
                <span className="text-foreground font-mono">Development</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Detection Model</span>
                <span className="text-foreground font-mono">YOLOv5</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Emotion API</span>
                <span className="text-foreground font-mono">Hume AI</span>
              </div>
            </div>
          </div>

          {/* Quick tips */}
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-6 space-y-3">
            <h4 className="font-medium text-foreground">Quick Tips</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <span>Upload ads as images or short videos (under 60 seconds)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <span>Reaction videos should show clear facial expressions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <span>Export training data in JSONL format for fine-tuning</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <span>Higher frame rates give more detail but slower processing</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
