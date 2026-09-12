import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { CallService } from '../../../packages/call-core/src/call-service.js';
import { InMemoryEventStore } from '../../../packages/call-core/src/event-store.js';
import { FakeProviderAdapter } from '../../../packages/call-core/src/fake-provider.js';
import { InMemoryIdempotencyStore } from '../../../packages/call-core/src/idempotency.js';
import { InMemoryCallRateLimiter } from '../../../packages/call-core/src/rate-limit.js';
import { createApp } from './app.js';

function createHarness(nodeEnv = 'test') {
  let nextId = 0;
  const provider = new FakeProviderAdapter();
  const eventStore = new InMemoryEventStore(() => '2026-09-12T00:00:00.000Z');
  const service = new CallService({
    provider,
    eventStore,
    idempotencyStore: new InMemoryIdempotencyStore(),
    rateLimiter: new InMemoryCallRateLimiter(20, 60_000),
    idFactory: () => `adt_call_${++nextId}`,
    clock: () => '2026-09-12T00:00:00.000Z',
  });
  const app = createApp({ callService: service, provider, eventStore, nodeEnv });
  return { app, service, provider, eventStore };
}

async function createOutboundCall(app: ReturnType<typeof createApp>) {
  const response = await request(app)
    .post('/v1/calls')
    .set('Idempotency-Key', `key-${Math.random()}`)
    .set('X-Aditunis-Principal', 'user-1')
    .send({ destination: '+61255501234', communicationMode: 'voice_text' });
  expect(response.status).toBe(201);
  return response.body.callId as string;
}

describe('Aditunis gateway', () => {
  it('creates a sandbox call with a provider-neutral response', async () => {
    const { app } = createHarness();
    const response = await request(app)
      .post('/v1/calls')
      .set('Idempotency-Key', 'test-1')
      .set('X-Aditunis-Principal', 'user-1')
      .send({ destination: '+61255501234', communicationMode: 'voice_text' });

    expect(response.status).toBe(201);
    expect(response.body.callId).toMatch(/^adt_call_/);
    expect(response.body.state).toBe('DIALING');
    expect(response.body).not.toHaveProperty('callSid');
    expect(response.body).not.toHaveProperty('providerCallId');
  });

  it('requires an idempotency key for call creation', async () => {
    const { app } = createHarness();
    const response = await request(app)
      .post('/v1/calls')
      .set('X-Aditunis-Principal', 'user-1')
      .send({ destination: '+61255501234', communicationMode: 'voice_text' });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it.each(['000', '106', '112'])('blocks emergency number %s before provider invocation', async (number) => {
    const { app, provider } = createHarness();
    const response = await request(app)
      .post('/v1/calls')
      .set('Idempotency-Key', `emergency-${number}`)
      .set('X-Aditunis-Principal', 'user-1')
      .send({ destination: number, communicationMode: 'voice_text' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      code: 'POLICY_BLOCKED',
      message: 'Emergency calling is not available in this prototype.',
    });
    expect(provider.createCallCount).toBe(0);
  });

  it('reads and ends a provider-neutral call', async () => {
    const { app } = createHarness();
    const callId = await createOutboundCall(app);

    const read = await request(app).get(`/v1/calls/${callId}`);
    expect(read.status).toBe(200);
    expect(read.body.callId).toBe(callId);
    expect(read.body).not.toHaveProperty('providerCallId');

    const end = await request(app).post(`/v1/calls/${callId}/end`).send({ confirmed: true });
    expect(end.status).toBe(200);
    expect(end.body.state).toBe('ENDED');
  });

  it('supports an accessible sandbox incoming-call answer flow', async () => {
    const { app } = createHarness();
    const incoming = await request(app)
      .post('/v1/dev/incoming-call')
      .send({ from: '+61255509999', communicationMode: 'voice_text' });

    expect(incoming.status).toBe(201);
    expect(incoming.body.state).toBe('RINGING');

    const answer = await request(app)
      .post(`/v1/calls/${incoming.body.callId}/answer`)
      .send({});
    expect(answer.status).toBe(200);
    expect(answer.body.state).toBe('CONNECTED');
  });

  it('does not register the dev incoming-call route in production', async () => {
    const { app } = createHarness('production');
    const response = await request(app)
      .post('/v1/dev/incoming-call')
      .send({ from: '+61255509999', communicationMode: 'voice_text' });
    expect(response.status).toBe(404);
  });

  it('changes communication mode without exposing provider-specific identifiers', async () => {
    const { app } = createHarness();
    const callId = await createOutboundCall(app);
    const response = await request(app)
      .post(`/v1/calls/${callId}/mode`)
      .send({ communicationMode: 'text' });

    expect(response.status).toBe(200);
    expect(response.body.communicationMode).toBe('text');
    expect(response.body.capabilities).toMatchObject({ voice: true, text: true });
    expect(response.body).not.toHaveProperty('providerCallId');
  });

  it('returns provider-neutral call capabilities', async () => {
    const { app } = createHarness();
    const callId = await createOutboundCall(app);
    const response = await request(app).get(`/v1/calls/${callId}/capabilities`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ voice: true, text: true, nativeRtt: false, tty: false, dtmf: true });
  });

  it('validates DTMF and requires confirmation for sensitive DTMF', async () => {
    const { app, provider } = createHarness();
    const callId = await createOutboundCall(app);

    const invalid = await request(app)
      .post(`/v1/calls/${callId}/dtmf`)
      .send({ digits: '1?' });
    expect(invalid.status).toBe(400);

    const pending = await request(app)
      .post(`/v1/calls/${callId}/dtmf`)
      .send({ digits: '1', sensitive: true });
    expect(pending.status).toBe(409);
    expect(pending.body.status).toBe('confirmation_required');
    expect(provider.dtmf).toHaveLength(0);

    const confirmed = await request(app)
      .post(`/v1/calls/${callId}/dtmf`)
      .send({ digits: '1', sensitive: true, confirmed: true });
    expect(confirmed.status).toBe(204);
    expect(provider.dtmf).toEqual([{ providerCallId: `fake_${callId}`, digits: '1' }]);
  });

  it('exposes health and provider capabilities without carrier secrets', async () => {
    const { app } = createHarness();
    const health = await request(app).get('/v1/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('ok');

    const providers = await request(app).get('/v1/providers');
    expect(providers.status).toBe(200);
    expect(providers.body[0]).toMatchObject({ id: 'fake', capabilities: { voice: true } });
  });
});
