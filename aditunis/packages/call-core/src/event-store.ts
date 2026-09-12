import type { AditunisEvent, AditunisEventType } from '@aditunis/contracts';

export type EventClock = () => string;

export class InMemoryEventStore {
  private readonly events = new Map<string, AditunisEvent[]>();

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
}
