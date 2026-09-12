import { describe, expect, it } from 'vitest';
import {
  createClearMessage,
  createMediaMessage,
  parseTwilioMediaEvent,
} from './media-events.js';

describe('Twilio Media Streams events', () => {
  it.each(['connected', 'start', 'media', 'mark', 'stop'])('recognises %s events', (event) => {
    const base: Record<string, unknown> = { event };
    if (event === 'start') {
      base.start = { streamSid: 'MZ123', callSid: 'CA123' };
      base.streamSid = 'MZ123';
    }
    if (event === 'media') {
      base.streamSid = 'MZ123';
      base.media = { payload: '////' };
    }
    if (event === 'mark') {
      base.streamSid = 'MZ123';
      base.mark = { name: 'spoken-1' };
    }
    if (event === 'stop') {
      base.streamSid = 'MZ123';
      base.stop = { accountSid: 'AC123', callSid: 'CA123' };
    }

    expect(parseTwilioMediaEvent(JSON.stringify(base))?.event).toBe(event);
  });

  it('ignores unknown or malformed events rather than crashing the call path', () => {
    expect(parseTwilioMediaEvent('{"event":"future-event"}')).toBeUndefined();
    expect(parseTwilioMediaEvent('not-json')).toBeUndefined();
  });

  it('creates an exact clear command for STOP_OUTPUT', () => {
    expect(createClearMessage('MZ123')).toEqual({
      event: 'clear',
      streamSid: 'MZ123',
    });
  });

  it('creates outbound audio without adding file headers', () => {
    expect(createMediaMessage('MZ123', 'AAAA')).toEqual({
      event: 'media',
      streamSid: 'MZ123',
      media: { payload: 'AAAA' },
    });
  });
});
