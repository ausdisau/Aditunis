import { describe, expect, it, vi } from 'vitest';
import { TwilioMediaSessionRegistry } from './media-registry.js';

describe('TwilioMediaSessionRegistry', () => {
  it('clears queued audio for the active provider call', () => {
    const send = vi.fn();
    const registry = new TwilioMediaSessionRegistry();
    registry.register({ providerCallId: 'CA123', streamSid: 'MZ123', send });

    expect(registry.clear('CA123')).toBe(true);
    expect(send).toHaveBeenCalledWith(JSON.stringify({
      event: 'clear',
      streamSid: 'MZ123',
    }));
  });

  it('removes a stream without affecting later calls', () => {
    const send = vi.fn();
    const registry = new TwilioMediaSessionRegistry();
    registry.register({ providerCallId: 'CA123', streamSid: 'MZ123', send });
    registry.unregisterByStream('MZ123');

    expect(registry.clear('CA123')).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});
