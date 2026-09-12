import { describe, expect, it } from 'vitest';
import { createDefaultCommunicationProfile } from './profile.js';

describe('default communication profile', () => {
  it('does not time out a user for responding slowly', () => {
    const profile = createDefaultCommunicationProfile('default');
    expect(profile.responseTimeoutMs).toBeNull();
    expect(profile.speechPauseToleranceMs).toBe(1800);
    expect(profile.captionsAlwaysOn).toBe(true);
    expect(profile.largeTargets).toBe(true);
  });

  it('uses accessible timing defaults without encoding a diagnosis', () => {
    const profile = createDefaultCommunicationProfile('person-1');
    expect(profile.gazeDwellMs).toBe(650);
    expect(profile.switchScanIntervalMs).toBe(1200);
    expect(profile.confirmationThreshold).toBe(0.8);
    expect(profile).not.toHaveProperty('diagnosis');
  });
});
