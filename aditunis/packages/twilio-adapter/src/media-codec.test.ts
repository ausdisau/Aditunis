import { describe, expect, it } from 'vitest';
import { decodeTwilioMulaw, encodeTwilioMulaw } from './media-codec.js';

describe('Twilio G.711 mu-law codec boundary', () => {
  it('round-trips representative PCM16 samples within lossy codec tolerance', () => {
    const input = new Int16Array([
      -30000, -16000, -8000, -1000, -1, 0, 1, 1000, 8000, 16000, 30000,
    ]);
    const payload = encodeTwilioMulaw(input);
    const decoded = decodeTwilioMulaw(payload);

    expect(decoded).toHaveLength(input.length);
    for (let i = 0; i < input.length; i += 1) {
      expect(Math.abs(decoded[i]! - input[i]!)).toBeLessThan(1200);
    }
  });

  it('encodes silence into a stable base64 payload', () => {
    const payload = encodeTwilioMulaw(new Int16Array([0, 0, 0, 0]));
    expect(typeof payload).toBe('string');
    expect(decodeTwilioMulaw(payload)).toEqual(new Int16Array([0, 0, 0, 0]));
  });
});
