import type { AditunisEvent, AditunisEventType } from '@aditunis/contracts';

export type EventClock = () => string;
export type EventListener = (event: AditunisEvent) => void;

export class InMemoryEventStore {
  private readonly events = new Map<string, AditunisEvent[]>();
  private readonly listeners = new Map<string, Set<EventListener>>();

  constructor(
    private readonly clock: EventClock = () => new Date().toISOString(),
  ) {}

  append<T>(
    callId: string,
    type: AditunisEventType,
    payload: T,
  ): AditunisEvent<T> {
    const existing = this.events.get(callId) ?? [];
    const sequence = existing.length + 1;
    const event: AditunisEvent<T> = {
      eventId: `evt_${callId}_${sequence}`,
      callId,
      type,
      sequence,
      timestamp: this.clock(),
      payload,
    };
    existing.push(event as AditunisEvent);
    this.events.set(callId, existing);

    for (const listener of this.listeners.get(callId) ?? []) {
      listener(event as AditunisEvent);
    }

    return event;
  }

  after(callId: string, sequence: number): AditunisEvent[] {
    return (this.events.get(callId) ?? []).filter(
      (event) => event.sequence > sequence,
    );
  }

  all(callId: string): AditunisEvent[] {
    return [...(this.events.get(callId) ?? [])];
  }

  subscribe(callId: string, listener: EventListener): () => void {
    const listeners = this.listeners.get(callId) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(callId, listeners);

    return () => {
      const current = this.listeners.get(callId);
      current?.delete(listener);
      if (current?.size === 0) {
        this.listeners.delete(callId);
      }
    };
  }
}
