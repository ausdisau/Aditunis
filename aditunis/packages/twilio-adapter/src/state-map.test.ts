import { describe, expect, it } from 'vitest';
import { mapTwilioStatus } from './state-map.js';

describe('Twilio call status mapping', () => {
  it('maps active lifecycle statuses into Aditunis states', () => {
    expect(mapTwilioStatus('queued')).toEqual({ state: 'DIALING' });
    expect(mapTwilioStatus('initiated')).toEqual({ state: 'DIALING' });
    expect(mapTwilioStatus('ringing')).toEqual({ state: 'RINGING' });
    expect(mapTwilioStatus('in-progress')).toEqual({ state: 'CONNECTED' });
    expect(mapTwilioStatus('completed')).toEqual({ state: 'ENDED' });
  });

  it('maps terminal provider failures explicitly', () => {
    expect(mapTwilioStatus('busy')).toEqual({ state: 'ENDED', failureReason: 'BUSY' });
    expect(mapTwilioStatus('no-answer')).toEqual({ state: 'ENDED', failureReason: 'NO_ANSWER' });
    expect(mapTwilioStatus('failed')).toEqual({ state: 'ENDED', failureReason: 'PROVIDER_FAILED' });
  });

  it('does not invent a domain state for an unknown provider status', () => {
    expect(mapTwilioStatus('mystery')).toEqual({ providerDegraded: true });
  });
});
