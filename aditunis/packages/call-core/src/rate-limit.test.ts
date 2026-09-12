import { describe, expect, it } from 'vitest';
import { InMemoryCallRateLimiter } from './rate-limit.js';

describe('call rate limiter', () => {
  it('limits repeated calls per principal and destination', () => {
    const limiter = new InMemoryCallRateLimiter(2, 60_000);
    limiter.assertAllowed({ principal: 'user-1', destination: '+61255501234' }, 1_000);
    limiter.assertAllowed({ principal: 'user-1', destination: '+61255501234' }, 1_001);
    expect(() => limiter.assertAllowed(
      { principal: 'user-1', destination: '+61255501234' },
      1_002,
    )).toThrow(/rate limit/i);
  });

  it('does not share a bucket across different principals', () => {
    const limiter = new InMemoryCallRateLimiter(1, 60_000);
    limiter.assertAllowed({ principal: 'user-1', destination: '+61255501234' }, 1_000);
    expect(() => limiter.assertAllowed(
      { principal: 'user-2', destination: '+61255501234' },
      1_001,
    )).not.toThrow();
  });

  it('expires attempts after the configured window', () => {
    const limiter = new InMemoryCallRateLimiter(1, 100);
    limiter.assertAllowed({ principal: 'user-1', destination: '+61255501234' }, 1_000);
    expect(() => limiter.assertAllowed(
      { principal: 'user-1', destination: '+61255501234' },
      1_101,
    )).not.toThrow();
  });
});
