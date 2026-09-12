export class InMemoryIdempotencyStore<T = string> {
  private readonly values = new Map<string, T>();

  private key(principal: string, idempotencyKey: string): string {
    return `${principal}\u0000${idempotencyKey}`;
  }

  get(principal: string, idempotencyKey: string): T | undefined {
    return this.values.get(this.key(principal, idempotencyKey));
  }

  set(principal: string, idempotencyKey: string, value: T): void {
    this.values.set(this.key(principal, idempotencyKey), value);
  }
}
