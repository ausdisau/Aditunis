import { describe, expect, it } from 'vitest';
import { QUICK_PHRASES } from './quick-phrases.js';

describe('accessible quick phrases', () => {
  it('includes the configured please-wait phrase', () => {
    expect(QUICK_PHRASES).toContainEqual({
      id: 'please-wait',
      text: 'Please wait — I use assistive communication and need more time to respond.',
    });
  });

  it('contains the eight default phrases from the design', () => {
    expect(QUICK_PHRASES).toHaveLength(8);
  });
});
