import twilio from 'twilio';
import type {
  CommunicationMode,
  ProviderAdapter,
  ProviderCallResult,
  ProviderCapabilities,
  ProviderCreateCallInput,
} from '@aditunis/contracts';

export interface TwilioCreateCallParams {
  to: string;
  from: string;
  url: string;
  statusCallback: string;
  statusCallbackMethod: 'POST';
  statusCallbackEvent: Array<'initiated' | 'ringing' | 'answered' | 'completed'>;
}

export interface TwilioCallsApi {
  create(input: TwilioCreateCallParams): Promise<{ sid: string }>;
  complete(callSid: string): Promise<void>;
}

export interface TwilioSdkCredentials {
  accountSid: string;
  apiKey: string;
  apiSecret: string;
}

export function createTwilioCallsApi(credentials: TwilioSdkCredentials): TwilioCallsApi {
  const client = twilio(credentials.apiKey, credentials.apiSecret, {
    accountSid: credentials.accountSid,
  });

  return {
    async create(input) {
      const call = await client.calls.create(input);
      return { sid: call.sid };
    },
    async complete(callSid) {
      await client.calls(callSid).update({ status: 'completed' });
    },
  };
}

export interface TwilioProviderAdapterOptions {
  callsApi: TwilioCallsApi;
  fromNumber: string;
  voiceUrl: string;
  statusCallbackUrl: string;
  allowedDestinations: readonly string[];
}

export class TwilioProviderAdapter implements ProviderAdapter {
  readonly id = 'twilio';
  private readonly allowedDestinations: ReadonlySet<string>;

  constructor(private readonly options: TwilioProviderAdapterOptions) {
    if (!/^\+61\d{9}$/.test(options.fromNumber)) {
      throw new Error('Twilio fromNumber must be an Australian E.164 number.');
    }
    this.assertHttps(options.voiceUrl, 'voiceUrl');
    this.assertHttps(options.statusCallbackUrl, 'statusCallbackUrl');
    this.allowedDestinations = new Set(options.allowedDestinations);
  }

  async createCall(input: ProviderCreateCallInput): Promise<ProviderCallResult> {
    if (!this.allowedDestinations.has(input.destination)) {
      throw new Error('Destination is not on the Twilio live-call allowlist.');
    }

    const result = await this.options.callsApi.create({
      to: input.destination,
      from: this.options.fromNumber,
      url: this.options.voiceUrl,
      statusCallback: this.options.statusCallbackUrl,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });
    return { providerCallId: result.sid };
  }

  async endCall(providerCallId: string): Promise<void> {
    await this.options.callsApi.complete(providerCallId);
  }

  async changeMode(
    _providerCallId: string,
    _mode: CommunicationMode,
  ): Promise<ProviderCapabilities> {
    return this.capabilities();
  }

  async sendDtmf(): Promise<void> {
    throw new Error(
      'Outbound DTMF is not enabled for the Twilio Media Streams prototype.',
    );
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      voice: true,
      text: false,
      nativeRtt: false,
      tty: false,
      dtmf: false,
    };
  }

  private assertHttps(value: string, name: string): void {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      throw new Error(`${name} must use https://`);
    }
  }
}
