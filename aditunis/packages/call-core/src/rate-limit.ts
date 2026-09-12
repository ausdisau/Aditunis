export interface RateLimitKey {
  principal: string;
  destination: string;
}

export class InMemoryCallRateLimiter {
  private readonly attempts = new Map<string, number[]>();

  constructor(
    private readonly maxAttempts = 5,
    private readonly windowMs = 60_000,
  ) {}

  assertAllowed(key: RateLimitKey, now = Date.now()): void {
    const bucket = `${key.principal}\u0000${key.destination}`;
    const cutoff = now - this.windowMs;
    const recent = (this.attempts.get(bucket) ?? []).filter(
      (timestamp) => timestamp > cutoff,
    );

    if (recent.length >= this.maxAttempts) {
      throw new Error('Call rate limit exceeded for this destination.');
    }

    recent.push(now);
    this.attempts.set(bucket, recent);
  }
}
