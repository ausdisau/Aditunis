import twilio from 'twilio';
import { describe, expect, it } from 'vitest';
import { validateTwilioWebhook } from './webhook-validation.js';

describe('Twilio webhook validation', () => {
  it('accepts an authentic signed form webhook and rejects a mutated body', () => {
    const authToken = 'test_auth_token';
    const url = 'https://gateway.aditunis.example/providers/twilio/status';
    const params = { CallSid: 'CA123', CallStatus: 'ringing' };
    const signature = twilio.getExpectedTwilioSignature(authToken, url, params);

    expect(validateTwilioWebhook({ authToken, signature, url, params })).toBe(true);
    expect(validateTwilioWebhook({
      authToken,
      signature,
      url,
      params: { ...params, CallStatus: 'completed' },
    })).toBe(false);
  });

  it('rejects a missing signature', () => {
    expect(validateTwilioWebhook({
      authToken: 'test_auth_token',
      signature: '',
      url: 'https://gateway.aditunis.example/providers/twilio/status',
      params: {},
    })).toBe(false);
  });
});
