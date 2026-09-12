import type { CommunicationMode } from './call.js';
import type { TextOperation } from './text-transport.js';

export interface ProviderCapabilities {
  voice: boolean;
  text: boolean;
  nativeRtt: boolean;
  tty: boolean;
  dtmf: boolean;
}

export interface ProviderCreateCallInput {
  callId: string;
  destination: string;
  communicationMode: CommunicationMode;
}

export interface ProviderCallResult {
  providerCallId: string;
}

export interface ProviderAdapter {
  readonly id: string;
  createCall(input: ProviderCreateCallInput): Promise<ProviderCallResult>;
  answerCall?(providerCallId: string): Promise<void>;
  endCall(providerCallId: string): Promise<void>;
  sendText?(providerCallId: string, operation: TextOperation): Promise<void>;
  sendDtmf?(providerCallId: string, digits: string): Promise<void>;
  changeMode?(
    providerCallId: string,
    mode: CommunicationMode,
  ): Promise<ProviderCapabilities>;
  stopOutput?(providerCallId: string): Promise<void>;
  capabilities(): Promise<ProviderCapabilities>;
}
