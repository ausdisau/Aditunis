import {
  decodeTwilioMulaw,
  parseTwilioMediaEvent,
  type TwilioMediaSessionRegistry,
} from '@aditunis/twilio-adapter';

export interface AditunisTelephonyAudioFrame {
  providerCallId: string;
  streamSid: string;
  sampleRateHz: 8000;
  samples: Int16Array;
}

export interface TwilioMediaConnectionOptions {
  registry: TwilioMediaSessionRegistry;
  send(message: string): void;
  onAudio(frame: AditunisTelephonyAudioFrame): void;
}

export class TwilioMediaConnection {
  private streamSid: string | undefined;
  private providerCallId: string | undefined;

  constructor(private readonly options: TwilioMediaConnectionOptions) {}

  receive(rawMessage: string): void {
    const event = parseTwilioMediaEvent(rawMessage);
    if (!event) return;

    switch (event.event) {
      case 'connected':
      case 'mark':
        return;

      case 'start':
        this.unregisterCurrentStream();
        this.streamSid = event.streamSid;
        this.providerCallId = event.start.callSid;
        this.options.registry.register({
          providerCallId: event.start.callSid,
          streamSid: event.streamSid,
          send: this.options.send,
        });
        return;

      case 'media':
        if (
          !this.providerCallId ||
          !this.streamSid ||
          event.streamSid !== this.streamSid
        ) {
          return;
        }

        this.options.onAudio({
          providerCallId: this.providerCallId,
          streamSid: this.streamSid,
          sampleRateHz: 8000,
          samples: decodeTwilioMulaw(event.media.payload),
        });
        return;

      case 'stop':
        if (event.streamSid === this.streamSid) {
          this.unregisterCurrentStream();
        }
        return;
    }
  }

  close(): void {
    this.unregisterCurrentStream();
  }

  private unregisterCurrentStream(): void {
    if (this.streamSid) {
      this.options.registry.unregisterByStream(this.streamSid);
    }
    this.streamSid = undefined;
    this.providerCallId = undefined;
  }
}

export function isTwilioMediaUpgradePath(requestUrl: string | undefined): boolean {
  if (!requestUrl) return false;

  try {
    const url = new URL(requestUrl, 'http://localhost');
    return url.pathname === '/providers/twilio/media';
  } catch {
    return false;
  }
}
