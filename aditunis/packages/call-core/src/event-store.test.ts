import { describe, expect, it } from 'vitest';
import { InMemoryEventStore } from './event-store.js';

describe('event store', () => {
  it('assigns monotonically increasing per-call sequences and replays later events', () => {
    const store = new InMemoryEventStore(() => '2026-09-12T00:00:00.000Z');

    const first = store.append('adt_call_1', 'call.created', { state: 'NEW' });
    const second = store.append('adt_call_1', 'call.dialing', { state: 'DIALING' });
    const third = store.append('adt_call_1', 'call.ringing', { state: 'RINGING' });

    expect([first.sequence, second.sequence, third.sequence]).toEqual([1, 2, 3]);
    expect(store.after('adt_call_1', 1).map((event) => event.sequence)).toEqual([2, 3]);
  });

  it('keeps sequence counters independent per call', () => {
    const store = new InMemoryEventStore();
    expect(store.append('a', 'call.created', {}).sequence).toBe(1);
    expect(store.append('b', 'call.created', {}).sequence).toBe(1);
  });
});
