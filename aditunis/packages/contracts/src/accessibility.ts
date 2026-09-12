export const SEMANTIC_ACTIONS = [
  'START_CALL',
  'ANSWER_CALL',
  'END_CALL',
  'SEND_MESSAGE',
  'CONFIRM_MESSAGE',
  'EDIT_MESSAGE',
  'CANCEL_MESSAGE',
  'STOP_OUTPUT',
  'REPEAT_REMOTE',
  'SLOW_REMOTE',
  'TOGGLE_CAPTIONS',
  'OPEN_KEYBOARD',
  'SELECT_QUICK_PHRASE',
  'CHANGE_MODE',
  'SEND_DTMF',
  'SEND_DTMF_SENSITIVE',
  'ENABLE_RECORDING',
  'BRIDGE_THIRD_PARTY',
] as const;

export type SemanticAction = (typeof SEMANTIC_ACTIONS)[number];

export type CommunicationInput = 'speech' | 'touch' | 'keyboard' | 'switch' | 'gaze';
export type CommunicationOutput = 'audio' | 'captions' | 'text' | 'tts';

export interface CommunicationProfile {
  id: string;
  preferredInputs: CommunicationInput[];
  preferredOutputs: CommunicationOutput[];
  captionsAlwaysOn: boolean;
  responseTimeoutMs: number | null;
  gazeDwellMs: number;
  switchScanIntervalMs: number;
  speechPauseToleranceMs: number;
  confirmationThreshold: number;
  largeTargets: boolean;
  reduceMotion: boolean;
  quickPhraseIds: string[];
}
