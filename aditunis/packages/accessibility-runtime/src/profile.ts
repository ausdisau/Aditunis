import type { CommunicationProfile } from '@aditunis/contracts';
import { QUICK_PHRASES } from './quick-phrases.js';

export function createDefaultCommunicationProfile(id: string): CommunicationProfile {
  return {
    id,
    preferredInputs: ['speech', 'touch', 'keyboard'],
    preferredOutputs: ['audio', 'captions', 'text', 'tts'],
    captionsAlwaysOn: true,
    responseTimeoutMs: null,
    gazeDwellMs: 650,
    switchScanIntervalMs: 1200,
    speechPauseToleranceMs: 1800,
    confirmationThreshold: 0.8,
    largeTargets: true,
    reduceMotion: false,
    quickPhraseIds: QUICK_PHRASES.map((phrase) => phrase.id),
  };
}
