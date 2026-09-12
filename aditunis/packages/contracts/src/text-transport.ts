export type TextOperation =
  | { kind: 'append'; text: string }
  | { kind: 'delete'; count: number }
  | { kind: 'commit' };

export interface TextTransportCapabilities {
  nativeRtt: boolean;
  tty: boolean;
  sandboxText: boolean;
}

export interface TextTransport {
  capabilities(): Promise<TextTransportCapabilities>;
  send(callId: string, operation: TextOperation): Promise<void>;
  close(callId: string): Promise<void>;
}
