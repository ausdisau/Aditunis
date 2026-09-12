import type { AditunisEvent } from '@aditunis/contracts';
import { InMemoryEventStore } from '@aditunis/call-core';

export class RealtimeHub {
  constructor(private readonly eventStore: InMemoryEventStore) {}

  replay(callId: string, afterSequence: number): AditunisEvent[] {
    return this.eventStore.after(callId, afterSequence);
  }

  subscribe(
    callId: string,
    listener: (event: AditunisEvent) => void,
  ): () => void {
    return this.eventStore.subscribe(callId, listener);
  }
}
