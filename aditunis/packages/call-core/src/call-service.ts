import type {
  AditunisEventType,
  CallFailureReason,
  CallSnapshot,
  CallState,
  CommunicationMode,
  ProviderAdapter,
  ProviderCapabilities,
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

export interface IncomingProviderCallInput extends IncomingSandboxCallInput {
  providerCallId: string;
}

export interface ProviderStateUpdate {
  state: CallState;
  failureReason?: CallFailureReason;
}

export interface CallServiceOptions {
  provider: ProviderAdapter;
  eventStore: InMemoryEventStore;
  idempotencyStore: InMemoryIdempotencyStore<string>;
  rateLimiter: InMemoryCallRateLimiter;
  idFactory?: () => string;
  clock?: () => string;
}

export interface ModeChangeResult {
  call: CallSnapshot;
  capabilities: ProviderCapabilities;
}

export class CallService {
  private readonly calls = new Map<string, CallSnapshot>();
  private readonly providerCallIds = new Map<string, string>();
  private readonly callIdsByProvider = new Map<string, string>();
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
    this.bindProviderCall(callId, providerResult.providerCallId);

    call = this.transition(callId, 'DIALING', 'call.dialing');
    this.options.idempotencyStore.set(
      input.principal,
      input.idempotencyKey,
      callId,
    );

    return { ...call };
  }

  createIncomingSandboxCall(input: IncomingSandboxCallInput): CallSnapshot {
    return this.createIncomingCall(input);
  }

  registerIncomingProviderCall(input: IncomingProviderCallInput): CallSnapshot {
    const existingCallId = this.callIdsByProvider.get(input.providerCallId);
    if (existingCallId) {
      return this.requireCall(existingCallId);
    }

    const call = this.createIncomingCall(input);
    this.bindProviderCall(call.callId, input.providerCallId);
    return call;
  }

  callIdForProvider(providerCallId: string): string | undefined {
    return this.callIdsByProvider.get(providerCallId);
  }

  applyProviderState(
    providerCallId: string,
    update: ProviderStateUpdate,
  ): CallSnapshot {
    const callId = this.requireCallIdForProvider(providerCallId);
    const current = this.requireCall(callId);

    if (current.state !== update.state) {
      transitionCallState(current.state, update.state);
    }

    const updated: CallSnapshot = {
      ...current,
      state: update.state,
      failureReason: update.failureReason ?? current.failureReason,
      updatedAt: this.clock(),
    };
    this.calls.set(callId, updated);

    if (update.failureReason) {
      this.options.eventStore.append(callId, 'call.failed', {
        state: update.state,
        failureReason: update.failureReason,
      });
    } else if (current.state !== update.state) {
      const eventType = this.eventTypeForState(update.state, current.state);
      if (eventType) {
        this.options.eventStore.append(callId, eventType, { state: update.state });
      }
    }

    return { ...updated };
  }

  markProviderDegraded(providerCallId: string, reason: string): void {
    const callId = this.requireCallIdForProvider(providerCallId);
    this.options.eventStore.append(callId, 'provider.degraded', { reason });
  }

  async answerCall(callId: string): Promise<CallSnapshot> {
    const providerCallId = this.providerCallIds.get(callId);
    if (providerCallId && this.options.provider.answerCall) {
      await this.options.provider.answerCall(providerCallId);
    }
    return this.transition(callId, 'CONNECTED', 'call.connected');
  }

  async endCall(callId: string): Promise<CallSnapshot> {
    let call = this.requireCall(callId);
    if (call.state === 'ENDED') {
      return call;
    }

    call = this.transition(callId, 'TERMINATING');
    const providerCallId = this.providerCallIds.get(callId);
    if (providerCallId) {
      await this.options.provider.endCall(providerCallId);
    }
    call = this.transition(callId, 'ENDED', 'call.ended');
    return call;
  }

  async changeMode(callId: string, communicationMode: CommunicationMode): Promise<ModeChangeResult> {
    const current = this.requireCall(callId);
    this.options.eventStore.append(callId, 'mode.requested', { communicationMode });
    const providerCallId = this.providerCallIds.get(callId);
    const capabilities = providerCallId && this.options.provider.changeMode
      ? await this.options.provider.changeMode(providerCallId, communicationMode)
      : await this.options.provider.capabilities();

    const updated: CallSnapshot = {
      ...current,
      communicationMode,
      updatedAt: this.clock(),
    };
    this.calls.set(callId, updated);
    this.options.eventStore.append(callId, 'mode.changed', { communicationMode });
    return { call: { ...updated }, capabilities };
  }

  async sendDtmf(callId: string, digits: string): Promise<void> {
    const providerCallId = this.providerCallIds.get(callId);
    if (!providerCallId) {
      throw new Error('DTMF is unavailable for this sandbox call.');
    }
    if (!this.options.provider.sendDtmf) {
      throw new Error('DTMF is unavailable from the selected provider.');
    }
    await this.options.provider.sendDtmf(providerCallId, digits);
  }

  async stopOutput(callId: string): Promise<void> {
    const providerCallId = this.providerCallIds.get(callId);
    if (!providerCallId) {
      throw new Error('No provider media session is available for this call.');
    }
    if (!this.options.provider.stopOutput) {
      throw new Error('Stopping queued output is unavailable from the selected provider.');
    }
    await this.options.provider.stopOutput(providerCallId);
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return this.options.provider.capabilities();
  }

  getCall(callId: string): CallSnapshot | undefined {
    const call = this.calls.get(callId);
    return call ? { ...call } : undefined;
  }

  providerCallId(callId: string): string | undefined {
    return this.providerCallIds.get(callId);
  }

  private createIncomingCall(input: IncomingSandboxCallInput): CallSnapshot {
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

  private bindProviderCall(callId: string, providerCallId: string): void {
    this.providerCallIds.set(callId, providerCallId);
    this.callIdsByProvider.set(providerCallId, callId);
  }

  private requireCallIdForProvider(providerCallId: string): string {
    const callId = this.callIdsByProvider.get(providerCallId);
    if (!callId) {
      throw new Error(`Unknown provider call: ${providerCallId}`);
    }
    return callId;
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
    eventType?: AditunisEventType,
  ): CallSnapshot {
    const current = this.requireCall(callId);
    const state = transitionCallState(current.state, nextState);
    const updated: CallSnapshot = {
      ...current,
      state,
      updatedAt: this.clock(),
    };
    this.calls.set(callId, updated);
    if (eventType) {
      this.options.eventStore.append(callId, eventType, { state });
    }
    return { ...updated };
  }

  private eventTypeForState(
    state: CallState,
    previousState: CallState,
  ): AditunisEventType | undefined {
    switch (state) {
      case 'DIALING': return 'call.dialing';
      case 'RINGING': return 'call.ringing';
      case 'CONNECTED': return 'call.connected';
      case 'HELD': return 'call.held';
      case 'ACTIVE': return previousState === 'HELD' ? 'call.resumed' : undefined;
      case 'ENDED': return 'call.ended';
      default: return undefined;
    }
  }
}
