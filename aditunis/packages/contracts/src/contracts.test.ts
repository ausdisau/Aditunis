import { describe, expect, it } from 'vitest';
import {
  CALL_STATES,
  DEFAULT_COMMUNICATION_MODE,
  type CommunicationProvenance,
  type ProviderAdapter,
} from './index.js';

describe('Aditunis shared contracts', () => {
  it('exports stable call states and provenance fields', () => {
    expect(CALL_STATES).toContain('CONNECTED');
    expect(DEFAULT_COMMUNICATION_MODE).toBe('voice_text');

    const provenance: CommunicationProvenance = {
      expressed: 'Please wait',
      inferred: 'Please wait',
      transmitted: 'Please wait',
      source: 'direct_user_input',
      confidence: 1,
    };

    expect(provenance.transmitted).toBe('Please wait');
  });

  it('keeps provider controls provider-neutral', async () => {
    const adapter: ProviderAdapter = {
      id: 'test',
      async createCall() {
        return { providerCallId: 'provider-1' };
      },
      async answerCall() {},
      async endCall() {},
      async sendDtmf() {},
      async changeMode() {
        return {
          voice: true,
          text: true,
          nativeRtt: false,
          tty: false,
          dtmf: true,
        };
      },
      async capabilities() {
        return {
          voice: true,
          text: true,
          nativeRtt: false,
          tty: false,
          dtmf: true,
        };
      },
    };

    expect(adapter.id).toBe('test');
    expect(await adapter.capabilities()).toMatchObject({ voice: true, dtmf: true });
  });
});
