import { describe, expect, it } from 'vitest';
import { CallService } from './call-service.js';
import { InMemoryEventStore } from './event-store.js';
import { FakeProviderAdapter } from './fake-provider.js';
import { InMemoryIdempotencyStore } from './idempotency.js';
import { InMemoryCallRateLimiter } from './rate-limit.js';

function createService() {
  const provider = new FakeProviderAdapter();
  const service = new CallService({
    provider,
    eventStore: new InMemoryEventStore(() => '2026-09-12T00:00:00.000Z'),
    idempotencyStore: new InMemoryIdempotencyStore(),
    rateLimiter: new InMemoryCallRateLimiter(5, 60_000),
    idFactory: () => 'adt_call_1',
    clock: () => '2026-09-12T00:00:00.000Z',
  });
  return { service, provider };
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
});
