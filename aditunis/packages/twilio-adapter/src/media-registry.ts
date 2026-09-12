import { createClearMessage } from './media-events.js';

export interface TwilioMediaController {
  clear(providerCallId: string): boolean;
}

export interface TwilioMediaSession {
  providerCallId: string;
  streamSid: string;
  send(message: string): void;
}

export class TwilioMediaSessionRegistry implements TwilioMediaController {
  private readonly sessionsByCall = new Map<string, TwilioMediaSession>();
  private readonly providerCallByStream = new Map<string, string>();

  register(session: TwilioMediaSession): void {
    const existing = this.sessionsByCall.get(session.providerCallId);
    if (existing) {
      this.providerCallByStream.delete(existing.streamSid);
    }

    const existingProviderCall = this.providerCallByStream.get(session.streamSid);
    if (existingProviderCall) {
      this.sessionsByCall.delete(existingProviderCall);
    }

    this.sessionsByCall.set(session.providerCallId, session);
    this.providerCallByStream.set(session.streamSid, session.providerCallId);
  }

  unregisterByStream(streamSid: string): void {
    const providerCallId = this.providerCallByStream.get(streamSid);
    if (!providerCallId) return;

    this.providerCallByStream.delete(streamSid);
    const current = this.sessionsByCall.get(providerCallId);
    if (current?.streamSid === streamSid) {
      this.sessionsByCall.delete(providerCallId);
    }
  }

  clear(providerCallId: string): boolean {
    const session = this.sessionsByCall.get(providerCallId);
    if (!session) return false;

    session.send(JSON.stringify(createClearMessage(session.streamSid)));
    return true;
  }
}
