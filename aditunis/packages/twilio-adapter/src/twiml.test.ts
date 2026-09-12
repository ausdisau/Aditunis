import { describe, expect, it } from 'vitest';
import { createMediaStreamTwiml } from './twiml.js';

describe('Twilio Media Streams TwiML', () => {
  it('connects the call to a secure bidirectional media websocket', () => {
    const xml = createMediaStreamTwiml('wss://media.aditunis.example/providers/twilio/media');
    expect(xml).toContain('<Connect>');
    expect(xml).toContain('<Stream url="wss://media.aditunis.example/providers/twilio/media"');
    expect(xml).not.toMatch(/<Record\b/i);
  });

  it('rejects insecure or non-websocket media URLs', () => {
    expect(() => createMediaStreamTwiml('ws://example.test/media')).toThrow(/wss/i);
    expect(() => createMediaStreamTwiml('https://example.test/media')).toThrow(/wss/i);
  });
});
