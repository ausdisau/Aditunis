import { describe, expect, it } from 'vitest';
import { createDefaultCommunicationProfile } from './profile.js';
import { requiresConfirmation } from './confirmation.js';

const profile = createDefaultCommunicationProfile('p1');

describe('confirmation policy', () => {
  it('requires confirmation below the configured confidence threshold', () => {
    expect(requiresConfirmation(
      { action: 'SEND_MESSAGE', confidence: 0.79, source: 'model_inferred' },
      profile,
    )).toBe(true);
  });

  it('does not force confirmation for direct user text', () => {
    expect(requiresConfirmation(
      { action: 'SEND_MESSAGE', confidence: 1, source: 'direct_user_input' },
      profile,
    )).toBe(false);
  });

  it('always confirms consequential actions', () => {
    expect(requiresConfirmation(
      { action: 'END_CALL', confidence: 1, source: 'direct_user_input' },
      profile,
    )).toBe(true);
    expect(requiresConfirmation(
      { action: 'SEND_DTMF_SENSITIVE', confidence: 1, source: 'direct_user_input' },
      profile,
    )).toBe(true);
  });
});
