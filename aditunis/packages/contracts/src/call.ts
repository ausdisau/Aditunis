export const CALL_STATES = [
  'NEW',
  'AUTHORISING',
  'DIALING',
  'RINGING',
  'CONNECTED',
  'ACTIVE',
  'HELD',
  'DEGRADED',
  'RECONNECTING',
  'TERMINATING',
  'ENDED',
] as const;

export type CallState = (typeof CALL_STATES)[number];

export const CALL_FAILURE_REASONS = [
  'BUSY',
  'REJECTED',
  'NO_ANSWER',
  'AUTH_FAILED',
  'PROVIDER_FAILED',
  'UNSUPPORTED_MEDIA',
  'POLICY_BLOCKED',
] as const;

export type CallFailureReason = (typeof CALL_FAILURE_REASONS)[number];

export const COMMUNICATION_MODES = [
  'voice',
  'text',
  'voice_text',
  'tts_voice',
] as const;

export type CommunicationMode = (typeof COMMUNICATION_MODES)[number];

export const DEFAULT_COMMUNICATION_MODE: CommunicationMode = 'voice_text';

export type CallDirection = 'inbound' | 'outbound';

export interface CallSnapshot {
  callId: string;
  direction: CallDirection;
  destination: string | null;
  state: CallState;
  communicationMode: CommunicationMode;
  failureReason: CallFailureReason | null;
  createdAt: string;
  updatedAt: string;
}
