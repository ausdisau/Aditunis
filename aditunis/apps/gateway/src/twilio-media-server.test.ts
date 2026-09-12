import twilio from 'twilio';
import { describe, expect, it, vi } from 'vitest';
import {
  encodeTwilioMulaw,
  TwilioMediaSessionRegistry,
} from '@aditunis/twilio-adapter';
import {
  isTwilioMediaUpgradePath,
  TwilioMediaConnection,
  validateTwilioMediaUpgrade,
} from './twilio-media-server.js';

describe('TwilioMediaConnection', () => {
  it('registers a stream and forwards decoded audio without exposing raw transport events', () => {
    const registry = new TwilioMediaSessionRegistry();
    const send = vi.fn();
    const onAudio = vi.fn();
    const connection = new TwilioMediaConnection({ registry, send, onAudio });

    connection.receive(JSON.stringify({
      event: 'start',
      streamSid: 'MZ123',
      start: { streamSid: 'MZ123', callSid: 'CA123' },
    }));

    const samples = new Int16Array([0, 1000, -1000, 8000, -8000]);
    connection.receive(JSON.stringify({
      event: 'media',
      streamSid: 'MZ123',
      media: { payload: encodeTwilioMulaw(samples) },
    }));

    expect(onAudio).toHaveBeenCalledTimes(1);
    const frame = onAudio.mock.calls[0]![0];
    expect(frame.providerCallId).toBe('CA123');
    expect(frame.streamSid).toBe('MZ123');
    expect(frame.sampleRateHz).toBe(8000);
    expect(frame.samples).toBeInstanceOf(Int16Array);
    expect(frame).not.toHaveProperty('rawPayload');

    expect(registry.clear('CA123')).toBe(true);
    expect(send).toHaveBeenCalledWith(JSON.stringify({
      event: 'clear',
      streamSid: 'MZ123',
    }));
  });

  it('unregisters a media session on stop and socket close', () => {
    const registry = new TwilioMediaSessionRegistry();
    const connection = new TwilioMediaConnection({
      registry,
      send: vi.fn(),
      onAudio: vi.fn(),
    });

    connection.receive(JSON.stringify({
      event: 'start',
      streamSid: 'MZ123',
      start: { streamSid: 'MZ123', callSid: 'CA123' },
    }));
    connection.receive(JSON.stringify({
      event: 'stop',
      streamSid: 'MZ123',
      stop: { callSid: 'CA123' },
    }));
    expect(registry.clear('CA123')).toBe(false);

    connection.receive(JSON.stringify({
      event: 'start',
      streamSid: 'MZ456',
      start: { streamSid: 'MZ456', callSid: 'CA456' },
    }));
    connection.close();
    expect(registry.clear('CA456')).toBe(false);
  });

  it('ignores malformed, unknown, and out-of-order media events', () => {
    const onAudio = vi.fn();
    const connection = new TwilioMediaConnection({
      registry: new TwilioMediaSessionRegistry(),
      send: vi.fn(),
      onAudio,
    });

    expect(() => connection.receive('not-json')).not.toThrow();
    expect(() => connection.receive(JSON.stringify({ event: 'future-event' }))).not.toThrow();
    expect(() => connection.receive(JSON.stringify({
      event: 'media',
      streamSid: 'MZ123',
      media: { payload: '////' },
    }))).not.toThrow();
    expect(onAudio).not.toHaveBeenCalled();
  });
});

describe('Twilio media upgrade route', () => {
  it('accepts only the dedicated provider media path', () => {
    expect(isTwilioMediaUpgradePath('/providers/twilio/media')).toBe(true);
    expect(isTwilioMediaUpgradePath('/providers/twilio/media?token=ignored')).toBe(true);
    expect(isTwilioMediaUpgradePath('/v1/events')).toBe(false);
    expect(isTwilioMediaUpgradePath('/providers/twilio/status')).toBe(false);
  });

  it('validates the WebSocket handshake with the official Twilio signature algorithm', () => {
    const authToken = 'test_auth_token';
    const mediaWssUrl = 'wss://media.aditunis.example/providers/twilio/media';
    const signature = twilio.getExpectedTwilioSignature(authToken, mediaWssUrl, {});

    expect(validateTwilioMediaUpgrade({ authToken, mediaWssUrl, signature })).toBe(true);
    expect(validateTwilioMediaUpgrade({
      authToken,
      mediaWssUrl,
      signature: 'forged-signature',
    })).toBe(false);
  });
});
