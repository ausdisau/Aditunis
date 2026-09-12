import { describe, expect, it } from 'vitest';
import { transitionCallState } from './state-machine.js';

describe('call state machine', () => {
  it('permits the normal outbound sequence', () => {
    expect(transitionCallState('NEW', 'AUTHORISING')).toBe('AUTHORISING');
    expect(transitionCallState('AUTHORISING', 'DIALING')).toBe('DIALING');
    expect(transitionCallState('DIALING', 'RINGING')).toBe('RINGING');
    expect(transitionCallState('RINGING', 'CONNECTED')).toBe('CONNECTED');
    expect(transitionCallState('CONNECTED', 'ACTIVE')).toBe('ACTIVE');
    expect(transitionCallState('ACTIVE', 'TERMINATING')).toBe('TERMINATING');
    expect(transitionCallState('TERMINATING', 'ENDED')).toBe('ENDED');
  });

  it('rejects impossible transitions', () => {
    expect(() => transitionCallState('ENDED', 'CONNECTED')).toThrow(/invalid transition/i);
  });

  it('allows degraded calls to recover', () => {
    expect(transitionCallState('ACTIVE', 'DEGRADED')).toBe('DEGRADED');
    expect(transitionCallState('DEGRADED', 'ACTIVE')).toBe('ACTIVE');
  });
});
