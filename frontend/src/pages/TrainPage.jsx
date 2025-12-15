import { useState } from 'react';
import { AdSelector } from '../components/train/AdSelector';
import { ReactionUpload } from '../components/train/ReactionUpload';
import { EmotionTimeline } from '../components/train/EmotionTimeline';
import { RatingForm } from '../components/train/RatingForm';
import { TrainingDataTable } from '../components/train/TrainingDataTable';
import { JsonlExport } from '../components/train/JsonlExport';
import { Brain, Sparkles } from 'lucide-react';

export function TrainPage() {
  const [selectedAd, setSelectedAd] = useState(null);
  const [reaction, setReaction] = useState(null);
  const [emotionSummary, setEmotionSummary] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [liveFrameResults, setLiveFrameResults] = useState([]);

  const handleAnalysisComplete = (reactionData) => {
    setReaction(reactionData);
    setEmotionSummary(reactionData.emotion_summary);
    // Clear live frame results once analysis is complete
    setLiveFrameResults([]);
  };

  const handleFrameResultsUpdate = (frameResults) => {
    setLiveFrameResults(frameResults);
  };

  const handleRatingSubmit = () => {
    // Trigger table refresh
    setRefreshTrigger(prev => prev + 1);
  };

  const resetFlow = () => {
    setReaction(null);
    setEmotionSummary(null);
    setLiveFrameResults([]);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">
              Training Data Collection
            </h2>
            <p className="text-sm text-muted-foreground">
              Collect emotional responses and ratings for fine-tuning
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-purple-400">AI Training Mode</span>
        </div>
      </div>

      {/* Main content - two column layout */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left column - Input flow */}
        <div className="space-y-6">
          {/* Step 1: Select Ad */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="font-medium text-foreground">Select Analyzed Ad</h3>
            </div>
            <AdSelector
              selectedAd={selectedAd}
              onSelect={(ad) => {
                setSelectedAd(ad);
                resetFlow();
              }}
            />
          </div>

          {/* Step 2: Upload Reaction */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                selectedAd ? 'bg-purple-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </span>
              <h3 className={`font-medium ${selectedAd ? 'text-foreground' : 'text-muted-foreground'}`}>
                Upload Reaction Video
              </h3>
            </div>
            <ReactionUpload
              selectedAd={selectedAd}
              onAnalysisComplete={handleAnalysisComplete}
              onFrameResultsUpdate={handleFrameResultsUpdate}
            />
          </div>

          {/* Step 3: View Emotions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                emotionSummary ? 'bg-purple-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                3
              </span>
              <h3 className={`font-medium ${emotionSummary ? 'text-foreground' : 'text-muted-foreground'}`}>
                Emotion Analysis
              </h3>
            </div>
            <EmotionTimeline
              reactionId={reaction?.id}
              emotionSummary={emotionSummary}
              liveFrameResults={liveFrameResults}
            />
          </div>
        </div>

        {/* Right column - Rating & Data */}
        <div className="space-y-6">
          {/* Step 4: Rate Response */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                emotionSummary ? 'bg-purple-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                4
              </span>
              <h3 className={`font-medium ${emotionSummary ? 'text-foreground' : 'text-muted-foreground'}`}>
                Rate & Submit
              </h3>
            </div>
            <RatingForm
              selectedAd={selectedAd}
              reaction={reaction}
              emotionSummary={emotionSummary}
              onSubmit={handleRatingSubmit}
            />
          </div>

          {/* Training Data Table */}
          <TrainingDataTable refreshTrigger={refreshTrigger} />

          {/* Export */}
          <JsonlExport />
        </div>
      </div>
    </div>
  );
}

export default TrainPage;
