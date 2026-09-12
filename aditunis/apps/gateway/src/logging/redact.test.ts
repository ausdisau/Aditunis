import { describe, expect, it } from 'vitest';
import { redactForLog } from './redact.js';

describe('gateway log redaction', () => {
  it('recursively removes credentials and raw media values', () => {
    expect(redactForLog({
      callId: 'adt_call_1',
      authToken: 'secret',
      apiSecret: 'api-secret',
      authorization: 'Bearer secret',
      'x-twilio-signature': 'signed',
      nested: {
        mediaPayload: 'base64audio',
        audio: 'raw',
        rawAudio: Buffer.from([1, 2, 3]),
        safe: 'keep-me',
      },
    })).toEqual({
      callId: 'adt_call_1',
      authToken: '[REDACTED]',
      apiSecret: '[REDACTED]',
      authorization: '[REDACTED]',
      'x-twilio-signature': '[REDACTED]',
      nested: {
        mediaPayload: '[REDACTED]',
        audio: '[REDACTED]',
        rawAudio: '[REDACTED]',
        safe: 'keep-me',
      },
    });
  });

  it('preserves non-sensitive arrays and values', () => {
    expect(redactForLog({ states: ['RINGING', 'CONNECTED'], count: 2 })).toEqual({
      states: ['RINGING', 'CONNECTED'],
      count: 2,
    });
  });
});
