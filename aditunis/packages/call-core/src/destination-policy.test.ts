import { describe, expect, it } from 'vitest';
import { assertDestinationAllowed } from './destination-policy.js';

describe('destination policy', () => {
  for (const number of ['000', '106', '112', '0 0 0', '1-1-2']) {
    it(`blocks emergency destination ${number}`, () => {
      expect(() => assertDestinationAllowed(number)).toThrow(/emergency calling is not available/i);
    });
  }

  it('allows an Australian E.164 destination', () => {
    expect(() => assertDestinationAllowed('+61255501234')).not.toThrow();
  });

  it('rejects a non-Australian live destination', () => {
    expect(() => assertDestinationAllowed('+15551234567')).toThrow(/Australian/i);
  });
});
