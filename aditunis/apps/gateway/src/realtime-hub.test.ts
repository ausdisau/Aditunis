import { describe, expect, it, vi } from 'vitest';
import { InMemoryEventStore } from '../../../packages/call-core/src/event-store.js';
import { RealtimeHub } from './realtime-hub.js';

describe('RealtimeHub', () => {
  it('replays only events after the supplied sequence', () => {
    const store = new InMemoryEventStore(() => '2026-09-12T00:00:00.000Z');
    const hub = new RealtimeHub(store);
    store.append('adt_call_1', 'call.created', {});
    store.append('adt_call_1', 'call.dialing', {});
    store.append('adt_call_1', 'call.ringing', {});

    expect(hub.replay('adt_call_1', 1).map((event) => event.sequence)).toEqual([2, 3]);
  });

  it('publishes new events to call subscribers and allows unsubscribe', () => {
    const store = new InMemoryEventStore();
    const hub = new RealtimeHub(store);
    const listener = vi.fn();
    const unsubscribe = hub.subscribe('adt_call_1', listener);

    store.append('adt_call_1', 'call.created', {});
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.append('adt_call_1', 'call.dialing', {});
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
