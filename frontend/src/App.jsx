import { useState } from 'react';
import { Upload, Brain, Settings, Sparkles } from 'lucide-react';

// Import pages
import UploadPage from './pages/UploadPage';
import TrainPage from './pages/TrainPage';
import SettingsPage from './pages/SettingsPage';

const tabs = [
  { id: 'upload', label: 'Upload Ad', icon: Upload, component: UploadPage },
  { id: 'train', label: 'Train', icon: Brain, component: TrainPage },
  { id: 'settings', label: 'Settings', icon: Settings, component: SettingsPage },
];

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || UploadPage;

  return (
    <div className="min-h-screen bg-background bg-purple-mesh noise-overlay">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-gradient">
                  Ad Analyzer
                </h1>
                <p className="text-xs text-muted-foreground">
                  by Ultim AI Solutions
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            <nav className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/50">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                      transition-all duration-200 ease-out
                      ${isActive
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Status indicator */}
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-muted-foreground hidden md:inline">System Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="min-h-[calc(100vh-180px)] animate-fade-in">
          <ActiveComponent />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/20 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Ultim AI Services & Solutions.
            <span className="mx-2">|</span>
            Ad Effectiveness Analyzer Demo
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
