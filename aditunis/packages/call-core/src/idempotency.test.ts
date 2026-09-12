import { describe, expect, it } from 'vitest';
import { InMemoryIdempotencyStore } from './idempotency.js';

describe('idempotency store', () => {
  it('returns a previously stored result for the same principal and key', () => {
    const store = new InMemoryIdempotencyStore<string>();
    store.set('user-1', 'key-1', 'adt_call_1');
    expect(store.get('user-1', 'key-1')).toBe('adt_call_1');
    expect(store.get('user-2', 'key-1')).toBeUndefined();
  });
});
