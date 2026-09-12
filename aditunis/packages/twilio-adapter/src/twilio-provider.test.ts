import { describe, expect, it, vi } from 'vitest';
import { TwilioProviderAdapter, type TwilioCallsApi } from './twilio-provider.js';

function createHarness(allowedDestinations = ['+61255501234']) {
  const create = vi.fn(async () => ({ sid: 'CA123' }));
  const complete = vi.fn(async () => undefined);
  const callsApi: TwilioCallsApi = { create, complete };
  const provider = new TwilioProviderAdapter({
    callsApi,
    fromNumber: '+61255500000',
    voiceUrl: 'https://gateway.aditunis.example/providers/twilio/voice',
    statusCallbackUrl: 'https://gateway.aditunis.example/providers/twilio/status',
    allowedDestinations,
  });
  return { provider, create, complete };
}

describe('TwilioProviderAdapter', () => {
  it('creates an outbound call using only server configuration and returns a private provider id', async () => {
    const { provider, create } = createHarness();
    const result = await provider.createCall({
      callId: 'adt_call_1',
      destination: '+61255501234',
      communicationMode: 'voice_text',
    });

    expect(result).toEqual({ providerCallId: 'CA123' });
    expect(create).toHaveBeenCalledWith({
      to: '+61255501234',
      from: '+61255500000',
      url: 'https://gateway.aditunis.example/providers/twilio/voice',
      statusCallback: 'https://gateway.aditunis.example/providers/twilio/status',
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });
  });

  it('does not invoke Twilio for a non-allowlisted destination', async () => {
    const { provider, create } = createHarness();
    await expect(provider.createCall({
      callId: 'adt_call_2',
      destination: '+61255509999',
      communicationMode: 'voice_text',
    })).rejects.toThrow(/allowlist/i);
    expect(create).not.toHaveBeenCalled();
  });

  it('ends a live provider call without recording it', async () => {
    const { provider, complete } = createHarness();
    await provider.endCall('CA123');
    expect(complete).toHaveBeenCalledWith('CA123');
  });

  it('reports only capabilities this adapter can actually provide', async () => {
    const { provider } = createHarness();
    await expect(provider.capabilities()).resolves.toEqual({
      voice: true,
      text: false,
      nativeRtt: false,
      tty: false,
      dtmf: false,
    });
  });
});
