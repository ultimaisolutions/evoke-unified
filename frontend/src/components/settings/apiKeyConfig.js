import { Brain, Sparkles, Video } from 'lucide-react';

export const PREDEFINED_API_KEYS = [
  {
    id: 'hume_api_key',
    label: 'Hume AI API Key',
    description: 'Required for emotion analysis in reaction videos',
    helpUrl: 'https://platform.hume.ai',
    helpText: 'platform.hume.ai',
    testService: 'hume',
    Icon: Brain,
  },
  {
    id: 'openai_api_key',
    label: 'OpenAI API Key',
    description: 'Used for GPT-powered analysis and suggestions',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'platform.openai.com',
    testService: 'openai',
    Icon: Sparkles,
  },
  {
    id: 'google_video_api_key',
    label: 'Google Video Intelligence API Key',
    description: 'For advanced video content analysis',
    helpUrl: 'https://console.cloud.google.com/apis/credentials',
    helpText: 'Google Cloud Console',
    testService: 'google-video',
    Icon: Video,
  },
];
