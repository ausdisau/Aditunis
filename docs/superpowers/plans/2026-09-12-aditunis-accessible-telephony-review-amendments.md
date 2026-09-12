# Aditunis Accessible Telephony Plan — Self-Review Amendments

This file is a normative companion to `2026-09-12-aditunis-accessible-telephony.md`. It closes gaps found during the required plan self-review and must be read by the implementation agent before Task 1.

## Self-review result

The main plan covers the approved architecture, accessibility runtime, call core, Twilio adapter, Media Streams, React workspace, provenance/confirmation, RTT-ready text transport, CI, and E2E verification. The following requirements from the approved spec needed explicit implementation steps rather than being left implicit:

1. inbound `answer` control;
2. DTMF control and its sensitive-action confirmation rule;
3. communication-mode change control;
4. per-principal/per-destination rate limiting;
5. live-Twilio destination allowlisting;
6. log redaction tests;
7. inbound sandbox-call fixture for accessible answer-flow testing.

These amendments are mandatory additions to the tasks below.

---

## Amendment A — Contracts additions to Task 1

Extend `ProviderAdapter` and shared call commands with:

```ts
export interface ProviderAdapter {
  readonly id: string;
  createCall(input: ProviderCreateCallInput): Promise<ProviderCallResult>;
  answerCall?(providerCallId: string): Promise<void>;
  endCall(providerCallId: string): Promise<void>;
  sendText?(providerCallId: string, operation: TextOperation): Promise<void>;
  sendDtmf?(providerCallId: string, digits: string): Promise<void>;
  changeMode?(providerCallId: string, mode: CommunicationMode): Promise<ProviderCapabilities>;
  stopOutput?(providerCallId: string): Promise<void>;
  capabilities(): Promise<ProviderCapabilities>;
}
```

Add `ANSWER_CALL`, `CHANGE_MODE`, and `SEND_DTMF` to the semantic action union. Keep `SEND_DTMF_SENSITIVE` as the confirmation-policy classification used when DTMF is directed at a configured sensitive service.

Add contract tests that compile a fake adapter implementing `answerCall`, `sendDtmf`, and `changeMode` without exposing any Twilio-specific type.

---

## Amendment B — Call-core additions to Task 3

Create `aditunis/packages/call-core/src/rate-limit.ts` and `rate-limit.test.ts`.

Implement an in-memory prototype limiter with this interface:

```ts
export interface RateLimitKey {
  principal: string;
  destination: string;
}

export class InMemoryCallRateLimiter {
  constructor(
    private readonly maxAttempts = 5,
    private readonly windowMs = 60_000,
  ) {}

  assertAllowed(key: RateLimitKey, now = Date.now()): void;
}
```

Required tests:

```ts
it('limits repeated calls per principal and destination', () => {
  const limiter = new InMemoryCallRateLimiter(2, 60_000);
  limiter.assertAllowed({ principal: 'user-1', destination: '+61255501234' }, 1_000);
  limiter.assertAllowed({ principal: 'user-1', destination: '+61255501234' }, 1_001);
  expect(() => limiter.assertAllowed(
    { principal: 'user-1', destination: '+61255501234' },
    1_002,
  )).toThrow(/rate limit/i);
});

it('does not share a bucket across different principals', () => {
  const limiter = new InMemoryCallRateLimiter(1, 60_000);
  limiter.assertAllowed({ principal: 'user-1', destination: '+61255501234' }, 1_000);
  expect(() => limiter.assertAllowed(
    { principal: 'user-2', destination: '+61255501234' },
    1_001,
  )).not.toThrow();
});
```

`CallService.createCall()` order becomes:

```text
validate request
→ emergency/destination policy
→ live-provider allowlist policy
→ rate-limit check
→ idempotency lookup
→ create internal call ID
→ provider invocation
```

Emergency blocking remains before provider invocation in all cases.

Add a `createIncomingSandboxCall()` test helper used only in tests/dev sandbox mode. It creates an inbound `RINGING` call without an external carrier so the web application can test `ANSWER_CALL` accessibly.

---

## Amendment C — Gateway additions to Task 4

The REST surface must include every approved control route:

```text
POST /v1/calls
GET  /v1/calls/:callId
POST /v1/calls/:callId/answer
POST /v1/calls/:callId/end
POST /v1/calls/:callId/text
POST /v1/calls/:callId/mode
POST /v1/calls/:callId/dtmf
GET  /v1/calls/:callId/capabilities
GET  /v1/providers
GET  /v1/health
```

In sandbox/test only, expose:

```text
POST /v1/dev/incoming-call
```

The route must not be registered when `NODE_ENV=production`.

Principal resolution for the prototype is:

1. use an authenticated principal supplied by future auth middleware when present on `res.locals.principal`;
2. otherwise use `X-Aditunis-Principal` only in non-production sandbox/test mode;
3. otherwise fall back to request IP for rate-limit bucketing.

Do not treat `X-Aditunis-Principal` as production authentication.

Gateway tests must verify:

- inbound sandbox call can be answered;
- `POST /mode` never exposes provider-specific mode names;
- DTMF validates against `/^[0-9*#A-D]+$/`;
- sensitive DTMF returns `confirmation_required` until explicitly confirmed;
- `/v1/dev/incoming-call` is absent in production configuration.

---

## Amendment D — Twilio live-destination allowlist to Task 5

Add server configuration:

```text
ADITUNIS_TWILIO_ALLOWED_DESTINATIONS=+61255501234,+61400000000
```

When `ADITUNIS_PROVIDER=twilio`, a destination must be both:

- non-emergency and valid for the Australian prototype; and
- present in `ADITUNIS_TWILIO_ALLOWED_DESTINATIONS`.

The fake/sandbox provider may use configured sandbox aliases and does not require a real phone number.

Required test:

```ts
it('does not invoke Twilio for a non-allowlisted destination', async () => {
  await expect(service.createCall({
    principal: 'user-1',
    destination: '+61255509999',
    communicationMode: 'voice_text',
    idempotencyKey: 'deny-1',
  })).rejects.toThrow(/allowlist/i);
  expect(mockTwilioCallsCreate).not.toHaveBeenCalled();
});
```

---

## Amendment E — Redaction and logging to Tasks 5/6

Create `aditunis/apps/gateway/src/logging/redact.ts` and `redact.test.ts`.

Required behaviour:

```ts
export function redactForLog(value: unknown): unknown;
```

It recursively replaces values for keys matching, case-insensitively:

```text
authToken
apiSecret
authorization
x-twilio-signature
audio
mediaPayload
rawAudio
```

with `[REDACTED]`.

Required test:

```ts
expect(redactForLog({
  callId: 'adt_call_1',
  authToken: 'secret',
  nested: { mediaPayload: 'base64audio' },
})).toEqual({
  callId: 'adt_call_1',
  authToken: '[REDACTED]',
  nested: { mediaPayload: '[REDACTED]' },
});
```

The Media Streams handler must never log full `media.payload` values.

---

## Amendment F — Accessible inbound-answer and DTMF E2E to Task 10

Extend `accessible-call.spec.ts` with two flows:

### Inbound answer flow

1. create a sandbox inbound call fixture;
2. verify `Incoming call` is exposed in visible text and the accessibility tree;
3. focus the `Answer call` button by keyboard;
4. activate it with Enter;
5. verify the persistent state changes to `Connected` without replacing the transcript workspace.

### DTMF flow

1. open keypad from a normal secondary control;
2. verify all keys meet the 48 × 48 CSS px secondary target minimum;
3. enter a test digit sequence;
4. verify a sensitive-service fixture requires explicit confirmation;
5. cancel and verify no DTMF command was delivered to `FakeProviderAdapter`.

---

## Self-review closeout

After these amendments, every approved V0.1 requirement has an explicit implementation/test location. No implementation task may omit these amendments on the basis that they are in a separate document.