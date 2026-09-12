import { describe, expect, it } from 'vitest';
import { CallService } from './call-service.js';
import { InMemoryEventStore } from './event-store.js';
import { FakeProviderAdapter } from './fake-provider.js';
import { InMemoryIdempotencyStore } from './idempotency.js';
import { InMemoryCallRateLimiter } from './rate-limit.js';

function createService() {
  const provider = new FakeProviderAdapter();
  const eventStore = new InMemoryEventStore(() => '2026-09-12T00:00:00.000Z');
  const service = new CallService({
    provider,
    eventStore,
    idempotencyStore: new InMemoryIdempotencyStore(),
    rateLimiter: new InMemoryCallRateLimiter(5, 60_000),
    idFactory: () => 'adt_call_1',
    clock: () => '2026-09-12T00:00:00.000Z',
  });
  return { service, provider, eventStore };
}

describe('CallService', () => {
  it('does not invoke the provider for an emergency number', async () => {
    const { service, provider } = createService();

    await expect(service.createCall({
      principal: 'user-1',
      destination: '000',
      communicationMode: 'voice_text',
      idempotencyKey: 'emergency-1',
    })).rejects.toThrow(/emergency calling is not available/i);

    expect(provider.createCallCount).toBe(0);
  });

  it('returns the same logical call for an idempotent retry and invokes the provider once', async () => {
    const { service, provider } = createService();
    const input = {
      principal: 'user-1',
      destination: '+61255501234',
      communicationMode: 'voice_text' as const,
      idempotencyKey: 'retry-1',
    };

    const first = await service.createCall(input);
    const second = await service.createCall(input);

    expect(first.callId).toBe('adt_call_1');
    expect(second.callId).toBe(first.callId);
    expect(provider.createCallCount).toBe(1);
    expect(first.state).toBe('DIALING');
  });

  it('creates an inbound ringing call in sandbox mode without a carrier', () => {
    const { service } = createService();
    const call = service.createIncomingSandboxCall({
      from: '+61255509999',
      communicationMode: 'voice_text',
    });

    expect(call.direction).toBe('inbound');
    expect(call.state).toBe('RINGING');
  });

  it('registers an inbound provider call without leaking the provider id into the snapshot', () => {
    const { service } = createService();
    const call = service.registerIncomingProviderCall({
      providerCallId: 'CA123',
      from: '+61255509999',
      communicationMode: 'voice_text',
    });

    expect(call.direction).toBe('inbound');
    expect(call.state).toBe('RINGING');
    expect(call).not.toHaveProperty('providerCallId');
    expect(service.callIdForProvider('CA123')).toBe(call.callId);
  });

  it('applies provider lifecycle states to the mapped domain call', async () => {
    const { service } = createService();
    const call = await service.createCall({
      principal: 'user-1',
      destination: '+61255501234',
      communicationMode: 'voice_text',
      idempotencyKey: 'status-1',
    });
    const providerCallId = service.providerCallId(call.callId)!;

    expect(service.applyProviderState(providerCallId, { state: 'DIALING' }).state).toBe('DIALING');
    expect(service.applyProviderState(providerCallId, { state: 'RINGING' }).state).toBe('RINGING');
    expect(service.applyProviderState(providerCallId, { state: 'CONNECTED' }).state).toBe('CONNECTED');
    expect(service.applyProviderState(providerCallId, { state: 'ENDED' }).state).toBe('ENDED');
  });

  it('preserves a terminal provider failure reason', async () => {
    const { service, eventStore } = createService();
    const call = await service.createCall({
      principal: 'user-1',
      destination: '+61255501234',
      communicationMode: 'voice_text',
      idempotencyKey: 'busy-1',
    });
    const providerCallId = service.providerCallId(call.callId)!;

    const ended = service.applyProviderState(providerCallId, {
      state: 'ENDED',
      failureReason: 'BUSY',
    });
    expect(ended.state).toBe('ENDED');
    expect(ended.failureReason).toBe('BUSY');
    expect(eventStore.all(call.callId).at(-1)?.type).toBe('call.failed');
  });

  it('records provider degradation without forcing a call-state transition', async () => {
    const { service, eventStore } = createService();
    const call = await service.createCall({
      principal: 'user-1',
      destination: '+61255501234',
      communicationMode: 'voice_text',
      idempotencyKey: 'degraded-1',
    });
    const providerCallId = service.providerCallId(call.callId)!;

    service.markProviderDegraded(providerCallId, 'Unknown provider status');
    expect(service.getCall(call.callId)?.state).toBe('DIALING');
    expect(eventStore.all(call.callId).at(-1)).toMatchObject({
      type: 'provider.degraded',
      payload: { reason: 'Unknown provider status' },
    });
  });

  it('routes STOP_OUTPUT through the provider-neutral adapter', async () => {
    const { service, provider } = createService();
    const call = await service.createCall({
      principal: 'user-1',
      destination: '+61255501234',
      communicationMode: 'voice_text',
      idempotencyKey: 'stop-1',
    });

    await service.stopOutput(call.callId);
    expect(provider.stoppedOutputCallIds).toEqual([`fake_${call.callId}`]);
  });
});
