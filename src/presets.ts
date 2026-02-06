import type { Preset } from './types';

export const PRESETS: Preset[] = [
  { id: 'ig-post', name: 'Instagram Post', platform: 'instagram', width: 1080, height: 1080, aspectLabel: '1:1' },
  { id: 'li-banner', name: 'LinkedIn Banner', platform: 'linkedin', width: 1584, height: 396, aspectLabel: '4:1' },
  { id: 'tw-header', name: 'Twitter Header', platform: 'twitter', width: 1500, height: 500, aspectLabel: '3:1' },
  { id: 'yt-thumb', name: 'YouTube Thumbnail', platform: 'youtube', width: 1280, height: 720, aspectLabel: '16:9' },
];
