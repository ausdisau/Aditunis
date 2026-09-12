import type {
  CallSnapshot,
  CommunicationMode,
  ProviderAdapter,
} from '@aditunis/contracts';
import { assertDestinationAllowed } from './destination-policy.js';
import { InMemoryEventStore } from './event-store.js';
import { InMemoryIdempotencyStore } from './idempotency.js';
import { InMemoryCallRateLimiter } from './rate-limit.js';
import { transitionCallState } from './state-machine.js';

export interface CreateCallInput {
  principal: string;
  destination: string;
  communicationMode: CommunicationMode;
  idempotencyKey: string;
}

export interface IncomingSandboxCallInput {
  from: string;
  communicationMode: CommunicationMode;
}

export interface CallServiceOptions {
  provider: ProviderAdapter;
  eventStore: InMemoryEventStore;
  idempotencyStore: InMemoryIdempotencyStore<string>;
  rateLimiter: InMemoryCallRateLimiter;
  idFactory?: () => string;
  clock?: () => string;
}

export class CallService {
  private readonly calls = new Map<string, CallSnapshot>();
  private readonly providerCallIds = new Map<string, string>();
  private readonly idFactory: () => string;
  private readonly clock: () => string;

  constructor(private readonly options: CallServiceOptions) {
    this.idFactory = options.idFactory ?? (() => (
      `adt_call_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    ));
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  async createCall(input: CreateCallInput): Promise<CallSnapshot> {
    assertDestinationAllowed(input.destination);

    this.options.rateLimiter.assertAllowed({
      principal: input.principal,
      destination: input.destination,
    });

    const existingCallId = this.options.idempotencyStore.get(
      input.principal,
      input.idempotencyKey,
    );
    if (existingCallId) {
      return this.requireCall(existingCallId);
    }

    const callId = this.idFactory();
    const createdAt = this.clock();
    let call: CallSnapshot = {
      callId,
      direction: 'outbound',
      destination: input.destination,
      state: 'NEW',
      communicationMode: input.communicationMode,
      failureReason: null,
      createdAt,
      updatedAt: createdAt,
    };
    this.calls.set(callId, call);
    this.options.eventStore.append(callId, 'call.created', { state: call.state });

    call = this.transition(callId, 'AUTHORISING', 'call.authorised');

    const providerResult = await this.options.provider.createCall({
      callId,
      destination: input.destination,
      communicationMode: input.communicationMode,
    });
    this.providerCallIds.set(callId, providerResult.providerCallId);

    call = this.transition(callId, 'DIALING', 'call.dialing');
    this.options.idempotencyStore.set(
      input.principal,
      input.idempotencyKey,
      callId,
    );

    return { ...call };
  }

  createIncomingSandboxCall(input: IncomingSandboxCallInput): CallSnapshot {
    const callId = this.idFactory();
    const createdAt = this.clock();
    const initial: CallSnapshot = {
      callId,
      direction: 'inbound',
      destination: input.from,
      state: 'NEW',
      communicationMode: input.communicationMode,
      failureReason: null,
      createdAt,
      updatedAt: createdAt,
    };
    this.calls.set(callId, initial);
    this.options.eventStore.append(callId, 'call.created', { state: initial.state });
    return this.transition(callId, 'RINGING', 'call.ringing');
  }

  getCall(callId: string): CallSnapshot | undefined {
    const call = this.calls.get(callId);
    return call ? { ...call } : undefined;
  }

  providerCallId(callId: string): string | undefined {
    return this.providerCallIds.get(callId);
  }

  private requireCall(callId: string): CallSnapshot {
    const call = this.calls.get(callId);
    if (!call) {
      throw new Error(`Unknown call: ${callId}`);
    }
    return { ...call };
  }

  private transition(
    callId: string,
    nextState: CallSnapshot['state'],
    eventType: 'call.authorised' | 'call.dialing' | 'call.ringing',
  ): CallSnapshot {
    const current = this.requireCall(callId);
    const state = transitionCallState(current.state, nextState);
    const updated: CallSnapshot = {
      ...current,
      state,
      updatedAt: this.clock(),
    };
    this.calls.set(callId, updated);
    this.options.eventStore.append(callId, eventType, { state });
    return { ...updated };
  }
}
