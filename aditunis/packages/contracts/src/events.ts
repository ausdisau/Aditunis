export const ADITUNIS_EVENT_TYPES = [
  'call.created',
  'call.authorised',
  'call.dialing',
  'call.ringing',
  'call.connected',
  'call.held',
  'call.resumed',
  'call.ended',
  'call.failed',
  'media.audio.started',
  'media.audio.stopped',
  'media.degraded',
  'media.restored',
  'text.received',
  'text.sent',
  'capabilities.updated',
  'mode.requested',
  'mode.changed',
  'mode.degraded',
  'access.confirmation_required',
  'access.confirmation_resolved',
  'provider.connected',
  'provider.degraded',
  'provider.failed',
] as const;

export type AditunisEventType = (typeof ADITUNIS_EVENT_TYPES)[number];

export interface AditunisEvent<T = unknown> {
  eventId: string;
  callId: string;
  type: AditunisEventType;
  sequence: number;
  timestamp: string;
  payload: T;
}
