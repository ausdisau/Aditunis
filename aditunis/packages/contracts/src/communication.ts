export const COMMUNICATION_SOURCES = [
  'direct_user_input',
  'aac_selection',
  'user_confirmed',
  'model_inferred',
  'model_generated',
  'system_message',
] as const;

export type CommunicationSource = (typeof COMMUNICATION_SOURCES)[number];

export interface CommunicationProvenance {
  expressed: string | null;
  inferred: string | null;
  transmitted: string | null;
  source: CommunicationSource;
  confidence: number | null;
}

export interface OutgoingCommunication {
  callId: string;
  provenance: CommunicationProvenance;
}
