# Aditunis Accessible Telephony Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an accessibility-first Aditunis telephony prototype with a provider-neutral REST/WebSocket gateway, sandbox calling, Twilio Voice/Media Streams integration boundaries, and a usable React call workspace.

**Architecture:** Add an independent `aditunis/` TypeScript npm-workspaces project beside the existing `audiotool/`. Shared packages define provider-neutral contracts, accessibility behaviour, call state/policy, and the Twilio adapter; an Express/WebSocket gateway exposes the M2M interface; a Vite/React client provides the accessible call workspace. Twilio is one adapter, never the domain model.

**Tech Stack:** Node.js 22.13+, TypeScript 5.x, npm workspaces, React 19, Vite 7, Express 5, `ws`, Zod, Twilio Node SDK, Vitest, React Testing Library, `jest-axe`, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-12-aditunis-accessible-telephony-design.md`

## Global Constraints

- The existing `audiotool/` remains untouched except for repository-level documentation/CI integration that does not change its runtime.
- New implementation lives under `aditunis/`.
- WCAG 2.2 AA is the minimum; primary interactive targets are at least `64 × 64 CSS px`, secondary targets at least `48 × 48 CSS px`.
- The UI must reflow at `320 CSS px` and 200% text scale without losing controls or requiring horizontal page scrolling.
- `000`, `106`, and `112` are blocked before provider invocation in V0.1.
- No call recording is enabled by default.
- Browser code never receives Twilio API secrets or Auth Tokens.
- Low-confidence inferred communication is never transmitted before confirmation.
- Direct typed/AAC input can bypass model inference.
- A provider failure must not disable local typed/AAC controls.
- Twilio-specific states, IDs, and transport details do not leak into the web application contract.
- Physical TTY hardware is deferred; stable RTT/TextTransport and future V.18 adapter boundaries are included.
- Twilio ConversationRelay and Agent Connect are optional comparators/future middleware, not dependencies of the custom speech path.

---

## File Structure

```text
aditunis/
├── package.json
├── package-lock.json
├── tsconfig.base.json
├── vitest.workspace.ts
├── README.md
├── packages/
│   ├── contracts/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── call.ts
│   │       ├── events.ts
│   │       ├── communication.ts
│   │       ├── accessibility.ts
│   │       ├── provider.ts
│   │       ├── text-transport.ts
│   │       └── index.ts
│   ├── accessibility-runtime/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── profile.ts
│   │       ├── confirmation.ts
│   │       ├── quick-phrases.ts
│   │       ├── actions.ts
│   │       ├── index.ts
│   │       └── *.test.ts
│   ├── call-core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── state-machine.ts
│   │       ├── destination-policy.ts
│   │       ├── event-store.ts
│   │       ├── idempotency.ts
│   │       ├── call-service.ts
│   │       ├── fake-provider.ts
│   │       ├── index.ts
│   │       └── *.test.ts
│   └── twilio-adapter/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── state-map.ts
│           ├── twiml.ts
│           ├── webhook-validation.ts
│           ├── media-codec.ts
│           ├── media-events.ts
│           ├── twilio-provider.ts
│           ├── index.ts
│           └── *.test.ts
├── apps/
│   ├── gateway/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── config.ts
│   │       ├── server.ts
│   │       ├── app.ts
│   │       ├── realtime-hub.ts
│   │       ├── routes/
│   │       │   ├── calls.ts
│   │       │   ├── providers.ts
│   │       │   ├── health.ts
│   │       │   └── twilio.ts
│   │       └── *.test.ts
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── styles.css
│           ├── api/client.ts
│           ├── hooks/useCallSession.ts
│           ├── components/
│           │   ├── AppHeader.tsx
│           │   ├── CallStatusBar.tsx
│           │   ├── ConversationPanel.tsx
│           │   ├── MessageComposer.tsx
│           │   ├── ConfirmationPanel.tsx
│           │   ├── QuickPhraseGrid.tsx
│           │   ├── CallControls.tsx
│           │   └── AccessibilitySettings.tsx
│           └── *.test.tsx
└── e2e/
    ├── playwright.config.ts
    └── accessible-call.spec.ts

.github/workflows/aditunis-ci.yml
```

---

### Task 1: Scaffold the independent Aditunis workspace and shared contracts

**Files:**
- Create: `aditunis/package.json`
- Create: `aditunis/tsconfig.base.json`
- Create: `aditunis/vitest.workspace.ts`
- Create: `aditunis/packages/contracts/package.json`
- Create: `aditunis/packages/contracts/tsconfig.json`
- Create: `aditunis/packages/contracts/src/call.ts`
- Create: `aditunis/packages/contracts/src/events.ts`
- Create: `aditunis/packages/contracts/src/communication.ts`
- Create: `aditunis/packages/contracts/src/accessibility.ts`
- Create: `aditunis/packages/contracts/src/provider.ts`
- Create: `aditunis/packages/contracts/src/text-transport.ts`
- Create: `aditunis/packages/contracts/src/index.ts`
- Test: `aditunis/packages/contracts/src/contracts.test.ts`

**Interfaces:**
- Produces: `CallState`, `CallFailureReason`, `CommunicationMode`, `AditunisEvent`, `CommunicationProvenance`, `CommunicationProfile`, `SemanticAction`, `ProviderAdapter`, `TextTransport`.
- Consumes: none.

- [ ] **Step 1: Write a failing contract smoke test**

```ts
// packages/contracts/src/contracts.test.ts
import { describe, expect, it } from 'vitest';
import {
  CALL_STATES,
  DEFAULT_COMMUNICATION_MODE,
  type CommunicationProvenance,
} from './index.js';

describe('Aditunis shared contracts', () => {
  it('exports stable call states and provenance fields', () => {
    expect(CALL_STATES).toContain('CONNECTED');
    expect(DEFAULT_COMMUNICATION_MODE).toBe('voice_text');

    const provenance: CommunicationProvenance = {
      expressed: 'Please wait',
      inferred: 'Please wait',
      transmitted: 'Please wait',
      source: 'direct_user_input',
      confidence: 1,
    };
    expect(provenance.transmitted).toBe('Please wait');
  });
});
```

- [ ] **Step 2: Add the npm-workspaces scaffold and install dependencies**

`aditunis/package.json` must contain scripts that can build and test all workspaces:

```json
{
  "name": "aditunis",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.13.0" },
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "vitest run --workspace vitest.workspace.ts",
    "test:watch": "vitest --workspace vitest.workspace.ts",
    "lint:types": "npm run lint:types --workspaces --if-present"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 3: Run the contract test and verify it fails because exports do not exist**

Run:

```bash
cd aditunis
npm install
npm test -- packages/contracts/src/contracts.test.ts
```

Expected: FAIL because `./index.js` exports are not implemented.

- [ ] **Step 4: Implement the shared contracts**

Use string unions and readonly constants rather than provider-specific enums. Required core definitions:

```ts
export const CALL_STATES = [
  'NEW', 'AUTHORISING', 'DIALING', 'RINGING', 'CONNECTED', 'ACTIVE',
  'HELD', 'DEGRADED', 'RECONNECTING', 'TERMINATING', 'ENDED',
] as const;
export type CallState = (typeof CALL_STATES)[number];

export const CALL_FAILURE_REASONS = [
  'BUSY', 'REJECTED', 'NO_ANSWER', 'AUTH_FAILED', 'PROVIDER_FAILED',
  'UNSUPPORTED_MEDIA', 'POLICY_BLOCKED',
] as const;
export type CallFailureReason = (typeof CALL_FAILURE_REASONS)[number];

export type CommunicationMode = 'voice' | 'text' | 'voice_text' | 'tts_voice';
export const DEFAULT_COMMUNICATION_MODE: CommunicationMode = 'voice_text';
```

`ProviderAdapter` must expose provider-neutral methods:

```ts
export interface ProviderAdapter {
  readonly id: string;
  createCall(input: ProviderCreateCallInput): Promise<ProviderCallResult>;
  endCall(providerCallId: string): Promise<void>;
  sendText?(providerCallId: string, operation: TextOperation): Promise<void>;
  stopOutput?(providerCallId: string): Promise<void>;
  capabilities(): Promise<ProviderCapabilities>;
}
```

- [ ] **Step 5: Run tests and type checking**

Run:

```bash
npm test -- packages/contracts/src/contracts.test.ts
npm run lint:types
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add aditunis
 git commit -m "feat(aditunis): scaffold shared telephony contracts"
```

---

### Task 2: Implement the accessibility runtime

**Files:**
- Create: `aditunis/packages/accessibility-runtime/package.json`
- Create: `aditunis/packages/accessibility-runtime/tsconfig.json`
- Create: `aditunis/packages/accessibility-runtime/src/profile.ts`
- Create: `aditunis/packages/accessibility-runtime/src/confirmation.ts`
- Create: `aditunis/packages/accessibility-runtime/src/quick-phrases.ts`
- Create: `aditunis/packages/accessibility-runtime/src/actions.ts`
- Create: `aditunis/packages/accessibility-runtime/src/index.ts`
- Test: `aditunis/packages/accessibility-runtime/src/profile.test.ts`
- Test: `aditunis/packages/accessibility-runtime/src/confirmation.test.ts`
- Test: `aditunis/packages/accessibility-runtime/src/quick-phrases.test.ts`

**Interfaces:**
- Consumes: `CommunicationProfile`, `SemanticAction`, `CommunicationProvenance` from `@aditunis/contracts`.
- Produces: `createDefaultCommunicationProfile()`, `requiresConfirmation()`, `QUICK_PHRASES`, `mapActivationToAction()`.

- [ ] **Step 1: Write failing profile-default tests**

```ts
import { describe, expect, it } from 'vitest';
import { createDefaultCommunicationProfile } from './profile.js';

describe('default communication profile', () => {
  it('does not time out a user for responding slowly', () => {
    const profile = createDefaultCommunicationProfile('default');
    expect(profile.responseTimeoutMs).toBeNull();
    expect(profile.speechPauseToleranceMs).toBe(1800);
    expect(profile.captionsAlwaysOn).toBe(true);
    expect(profile.largeTargets).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npm test -- packages/accessibility-runtime/src/profile.test.ts`
Expected: FAIL because the function does not exist.

- [ ] **Step 3: Implement profile defaults exactly from the spec**

```ts
export function createDefaultCommunicationProfile(id: string): CommunicationProfile {
  return {
    id,
    preferredInputs: ['speech', 'touch', 'keyboard'],
    preferredOutputs: ['audio', 'captions', 'text', 'tts'],
    captionsAlwaysOn: true,
    responseTimeoutMs: null,
    gazeDwellMs: 650,
    switchScanIntervalMs: 1200,
    speechPauseToleranceMs: 1800,
    confirmationThreshold: 0.8,
    largeTargets: true,
    reduceMotion: false,
    quickPhraseIds: QUICK_PHRASES.map((phrase) => phrase.id),
  };
}
```

- [ ] **Step 4: Write failing confirmation-policy tests**

```ts
import { describe, expect, it } from 'vitest';
import { requiresConfirmation } from './confirmation.js';
import { createDefaultCommunicationProfile } from './profile.js';

const profile = createDefaultCommunicationProfile('p1');

describe('confirmation policy', () => {
  it('requires confirmation below the configured confidence threshold', () => {
    expect(requiresConfirmation({ action: 'SEND_MESSAGE', confidence: 0.79, source: 'model_inferred' }, profile)).toBe(true);
  });

  it('does not force confirmation for direct user text', () => {
    expect(requiresConfirmation({ action: 'SEND_MESSAGE', confidence: 1, source: 'direct_user_input' }, profile)).toBe(false);
  });

  it('always confirms consequential actions', () => {
    expect(requiresConfirmation({ action: 'END_CALL', confidence: 1, source: 'direct_user_input' }, profile)).toBe(true);
  });
});
```

- [ ] **Step 5: Implement confirmation policy and quick phrases**

`QUICK_PHRASES` must include the exact eight defaults from the spec, including:

```ts
{
  id: 'please-wait',
  text: 'Please wait — I use assistive communication and need more time to respond.',
}
```

`requiresConfirmation()` must treat `END_CALL`, `SEND_DTMF_SENSITIVE`, `ENABLE_RECORDING`, and `BRIDGE_THIRD_PARTY` as consequential actions.

- [ ] **Step 6: Run all accessibility-runtime tests**

Run: `npm test -- packages/accessibility-runtime/src`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add aditunis/packages/accessibility-runtime
 git commit -m "feat(aditunis): add accessibility runtime"
```

---

### Task 3: Implement deterministic call core, destination policy, event replay, and fake provider

**Files:**
- Create: `aditunis/packages/call-core/package.json`
- Create: `aditunis/packages/call-core/tsconfig.json`
- Create: `aditunis/packages/call-core/src/state-machine.ts`
- Create: `aditunis/packages/call-core/src/destination-policy.ts`
- Create: `aditunis/packages/call-core/src/event-store.ts`
- Create: `aditunis/packages/call-core/src/idempotency.ts`
- Create: `aditunis/packages/call-core/src/fake-provider.ts`
- Create: `aditunis/packages/call-core/src/call-service.ts`
- Create: `aditunis/packages/call-core/src/index.ts`
- Test: corresponding `*.test.ts` files.

**Interfaces:**
- Consumes: contracts and accessibility-runtime confirmation policy.
- Produces: `CallService`, `InMemoryEventStore`, `InMemoryIdempotencyStore`, `FakeProviderAdapter`, `assertDestinationAllowed()`, `transitionCallState()`.

- [ ] **Step 1: Write failing emergency-number policy tests**

```ts
import { describe, expect, it } from 'vitest';
import { assertDestinationAllowed } from './destination-policy.js';

describe('destination policy', () => {
  for (const number of ['000', '106', '112']) {
    it(`blocks ${number} before provider invocation`, () => {
      expect(() => assertDestinationAllowed(number)).toThrow(/prototype/i);
    });
  }

  it('allows an Australian E.164 test destination', () => {
    expect(() => assertDestinationAllowed('+61255501234')).not.toThrow();
  });
});
```

- [ ] **Step 2: Implement the destination policy**

Normalise whitespace and punctuation before evaluating emergency codes; never reinterpret an emergency code as a normal number. For V0.1, allow E.164 `+61...` numbers and configured explicit sandbox aliases only.

- [ ] **Step 3: Write failing state-machine tests**

```ts
import { describe, expect, it } from 'vitest';
import { transitionCallState } from './state-machine.js';

describe('call state machine', () => {
  it('permits the normal outbound sequence', () => {
    expect(transitionCallState('NEW', 'AUTHORISING')).toBe('AUTHORISING');
    expect(transitionCallState('AUTHORISING', 'DIALING')).toBe('DIALING');
    expect(transitionCallState('DIALING', 'RINGING')).toBe('RINGING');
    expect(transitionCallState('RINGING', 'CONNECTED')).toBe('CONNECTED');
  });

  it('rejects impossible transitions', () => {
    expect(() => transitionCallState('ENDED', 'CONNECTED')).toThrow(/invalid transition/i);
  });
});
```

- [ ] **Step 4: Implement state transitions as a readonly transition table**

Do not use an LLM or provider callback directly to mutate state. Provider callbacks are translated into requested transitions; `transitionCallState()` is the only legality gate.

- [ ] **Step 5: Write failing idempotency and event replay tests**

Verify the same idempotency key returns the same logical call ID and invokes `FakeProviderAdapter.createCall` exactly once. Verify `eventStore.after(callId, sequence)` returns ordered events with sequence values greater than the supplied number.

- [ ] **Step 6: Implement in-memory stores and `FakeProviderAdapter`**

`FakeProviderAdapter.createCall()` must return a deterministic provider-call ID and support configurable simulated outcomes without external services.

- [ ] **Step 7: Implement `CallService.createCall()`**

Execution order is mandatory:

```text
validate request
→ destination policy
→ idempotency lookup
→ create internal call ID
→ emit call.created
→ transition AUTHORISING
→ invoke provider
→ transition DIALING
→ persist provider mapping
→ return provider-neutral call snapshot
```

An emergency-number failure must occur before `provider.createCall()`.

- [ ] **Step 8: Run package tests**

Run: `npm test -- packages/call-core/src`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add aditunis/packages/call-core
 git commit -m "feat(aditunis): add deterministic call core"
```

---

### Task 4: Build the REST/WebSocket gateway around the fake provider

**Files:**
- Create: `aditunis/apps/gateway/package.json`
- Create: `aditunis/apps/gateway/tsconfig.json`
- Create: `aditunis/apps/gateway/src/config.ts`
- Create: `aditunis/apps/gateway/src/realtime-hub.ts`
- Create: `aditunis/apps/gateway/src/routes/calls.ts`
- Create: `aditunis/apps/gateway/src/routes/providers.ts`
- Create: `aditunis/apps/gateway/src/routes/health.ts`
- Create: `aditunis/apps/gateway/src/app.ts`
- Create: `aditunis/apps/gateway/src/server.ts`
- Test: `aditunis/apps/gateway/src/app.test.ts`
- Test: `aditunis/apps/gateway/src/realtime-hub.test.ts`

**Interfaces:**
- Consumes: `CallService`, provider contracts, shared schemas.
- Produces: `/v1/calls`, `/v1/calls/:id`, `/v1/calls/:id/end`, `/v1/calls/:id/text`, `/v1/calls/:id/mode`, `/v1/calls/:id/capabilities`, `/v1/providers`, `/v1/health`, `/v1/events`.

- [ ] **Step 1: Write failing API tests using the fake provider**

```ts
it('creates a sandbox call with a provider-neutral response', async () => {
  const response = await request(app)
    .post('/v1/calls')
    .set('Idempotency-Key', 'test-1')
    .send({ destination: '+61255501234', communicationMode: 'voice_text' });

  expect(response.status).toBe(201);
  expect(response.body.callId).toMatch(/^adt_call_/);
  expect(response.body).not.toHaveProperty('callSid');
  expect(response.body).not.toHaveProperty('providerCallId');
});
```

Also test `000`, `106`, and `112` return `403` with a plain-language `POLICY_BLOCKED` response.

- [ ] **Step 2: Implement Zod request schemas and REST routes**

Require `Idempotency-Key` for `POST /v1/calls`. Return stable error bodies:

```ts
{
  code: 'POLICY_BLOCKED',
  message: 'Emergency calling is not available in this prototype.',
}
```

- [ ] **Step 3: Write failing WebSocket replay tests**

Open `/v1/events?callId=<id>&after=0`, verify ordered events, disconnect, create another state event, reconnect with the last sequence, and verify only later events replay.

- [ ] **Step 4: Implement `RealtimeHub`**

Keep call transport alive when a browser WebSocket disconnects. The hub subscribes to `InMemoryEventStore` and publishes/replays domain events; it never owns call lifecycle state.

- [ ] **Step 5: Run gateway tests**

Run: `npm test -- apps/gateway/src`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add aditunis/apps/gateway
 git commit -m "feat(aditunis): expose provider-neutral telephony gateway"
```

---

### Task 5: Implement and harden the Twilio provider adapter

**Files:**
- Create: `aditunis/packages/twilio-adapter/package.json`
- Create: `aditunis/packages/twilio-adapter/tsconfig.json`
- Create: `aditunis/packages/twilio-adapter/src/state-map.ts`
- Create: `aditunis/packages/twilio-adapter/src/twiml.ts`
- Create: `aditunis/packages/twilio-adapter/src/webhook-validation.ts`
- Create: `aditunis/packages/twilio-adapter/src/twilio-provider.ts`
- Create: `aditunis/packages/twilio-adapter/src/index.ts`
- Modify: `aditunis/apps/gateway/src/config.ts`
- Create: `aditunis/apps/gateway/src/routes/twilio.ts`
- Modify: `aditunis/apps/gateway/src/app.ts`
- Test: adapter and route tests.

**Interfaces:**
- Consumes: `ProviderAdapter`, `CallService` state/event methods.
- Produces: `TwilioProviderAdapter`, `mapTwilioStatus()`, `createMediaStreamTwiml()`, `validateTwilioWebhook()`.

- [ ] **Step 1: Write failing status-mapping tests**

```ts
expect(mapTwilioStatus('queued')).toEqual({ state: 'DIALING' });
expect(mapTwilioStatus('ringing')).toEqual({ state: 'RINGING' });
expect(mapTwilioStatus('in-progress')).toEqual({ state: 'CONNECTED' });
expect(mapTwilioStatus('busy')).toEqual({ state: 'ENDED', failureReason: 'BUSY' });
expect(mapTwilioStatus('no-answer')).toEqual({ state: 'ENDED', failureReason: 'NO_ANSWER' });
```

- [ ] **Step 2: Implement Twilio status mapping**

Unknown statuses must map to a provider-degraded event rather than inventing a call state.

- [ ] **Step 3: Write failing TwiML tests**

Verify generated TwiML contains `<Connect><Stream>` with a `wss://` media URL and contains no recording verb.

- [ ] **Step 4: Implement TwiML generation using the Twilio SDK**

No raw XML string concatenation for user-controlled values. The adapter accepts a prevalidated public `wss://` base URL from server configuration.

- [ ] **Step 5: Write failing webhook-signature tests**

Use the official Twilio `RequestValidator` to generate/validate a known signed request. Verify a mutated body is rejected.

- [ ] **Step 6: Implement webhook signature validation**

`/providers/twilio/incoming` and `/providers/twilio/status` return `403` before any state mutation if `X-Twilio-Signature` is invalid.

- [ ] **Step 7: Write failing outbound-provider tests with a mocked Twilio client**

Assert:

- destination is passed in E.164 format;
- `from` number and webhook URLs come only from server configuration;
- status callbacks subscribe to initiated/ringing/answered/completed events;
- returned `CallSid` is stored only as provider data.

- [ ] **Step 8: Implement `TwilioProviderAdapter`**

Instantiate it only when all required server-side configuration is present. Otherwise the gateway stays in sandbox/fake-provider mode.

- [ ] **Step 9: Run adapter and gateway tests**

Run:

```bash
npm test -- packages/twilio-adapter/src apps/gateway/src
```

Expected: PASS without real Twilio credentials.

- [ ] **Step 10: Commit**

```bash
git add aditunis/packages/twilio-adapter aditunis/apps/gateway
 git commit -m "feat(aditunis): add Twilio voice provider adapter"
```

---

### Task 6: Implement Twilio Media Streams codec and interruption boundary

**Files:**
- Create: `aditunis/packages/twilio-adapter/src/media-codec.ts`
- Create: `aditunis/packages/twilio-adapter/src/media-events.ts`
- Test: `aditunis/packages/twilio-adapter/src/media-codec.test.ts`
- Test: `aditunis/packages/twilio-adapter/src/media-events.test.ts`
- Modify: `aditunis/apps/gateway/src/server.ts`

**Interfaces:**
- Consumes: Twilio WebSocket media event JSON.
- Produces: decoded PCM frames, outbound μ-law payloads, provider-neutral media lifecycle events, `clear` command for `STOP_OUTPUT`.

- [ ] **Step 1: Write failing μ-law round-trip tests**

Use a fixed PCM16 fixture containing silence and positive/negative sample values. Encode to μ-law, decode it, and assert decoded values are within a bounded lossy tolerance.

- [ ] **Step 2: Implement μ-law encode/decode and 8 kHz frame validation**

The codec API is explicit:

```ts
export function decodeTwilioMulaw(base64Payload: string): Int16Array;
export function encodeTwilioMulaw(samples: Int16Array): string;
```

Do not persist decoded frames.

- [ ] **Step 3: Write failing Media Streams event tests**

Verify `connected`, `start`, `media`, `mark`, and `stop` are recognised; unknown events are ignored/logged without throwing. Verify `createClearMessage(streamSid)` returns:

```json
{"event":"clear","streamSid":"MZ123"}
```

- [ ] **Step 4: Implement the internal media WebSocket**

Use a dedicated upgrade path such as `/providers/twilio/media`; do not mix these raw transport events with `/v1/events`.

- [ ] **Step 5: Connect `STOP_OUTPUT` to Twilio buffer clearing**

`CallService` invokes optional provider `stopOutput`; the Twilio adapter publishes a `clear` event to the current media stream. Fake provider records the action for tests.

- [ ] **Step 6: Run media tests**

Run: `npm test -- packages/twilio-adapter/src/media apps/gateway/src`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add aditunis/packages/twilio-adapter aditunis/apps/gateway
 git commit -m "feat(aditunis): add Twilio media stream bridge"
```

---

### Task 7: Build the branded accessible React call workspace

**Files:**
- Create: `aditunis/apps/web/package.json`
- Create: `aditunis/apps/web/tsconfig.json`
- Create: `aditunis/apps/web/vite.config.ts`
- Create: `aditunis/apps/web/index.html`
- Create: `aditunis/apps/web/src/main.tsx`
- Create: `aditunis/apps/web/src/App.tsx`
- Create: `aditunis/apps/web/src/styles.css`
- Create: all components under `aditunis/apps/web/src/components/`
- Create: `aditunis/apps/web/src/api/client.ts`
- Create: `aditunis/apps/web/src/hooks/useCallSession.ts`
- Test: component tests under `aditunis/apps/web/src/`.

**Interfaces:**
- Consumes: `/v1` REST API and `/v1/events`, shared contracts, accessibility runtime quick phrases.
- Produces: accessible call setup/workspace UI with semantic actions.

- [ ] **Step 1: Write the failing top-level accessibility test**

```tsx
render(<App />);
expect(screen.getByRole('main', { name: /communication workspace/i })).toBeInTheDocument();
expect(screen.getByRole('button', { name: /start call/i })).toBeInTheDocument();
expect(screen.getByRole('region', { name: /conversation/i })).toBeInTheDocument();
expect(await axe(document.body)).toHaveNoViolations();
```

- [ ] **Step 2: Build semantic HTML before visual styling**

The call screen must use:

- one `<main aria-label="Communication workspace">`;
- a visible `<header>` with Aditunis identity and plain-language call state;
- `<section aria-label="Conversation">` for transcript/captions;
- a labelled message composer;
- real `<button>` controls for actions;
- a restrained `aria-live="polite"` region for call-state changes;
- no click-only `<div>` controls.

- [ ] **Step 3: Write failing keyboard and target-size tests**

Component tests verify every primary control exposes `data-target-size="primary"`; CSS defines primary minimum `64px`, secondary minimum `48px`. Keyboard tests tab through controls in visual order and activate Start Call, Send, Stop Output, and End Call via Enter/Space.

- [ ] **Step 4: Implement the Australian Disability Ltd family visual system**

Use CSS custom properties:

```css
:root {
  --ad-blue: #1559d6;
  --ad-purple: #7b35c8;
  --ad-orange: #f26a2e;
  --ink: #172033;
  --muted-ink: #536079;
  --surface: #ffffff;
  --surface-soft: #f5f7fb;
  --focus: #0b57d0;
  --danger: #9f1c1c;
  --radius-lg: 1.25rem;
}
```

The brand gradient is limited to the logo/accent line. Critical states use labelled solid treatments and never colour alone.

- [ ] **Step 5: Implement the stable call workspace layout**

Desktop/tablet uses three vertical regions: sticky participant/status header, flexible transcript, composer/quick actions/control dock. Narrow viewports keep header and composer visible while transcript scrolls. Opening confirmation or keyboard panels does not replace the transcript.

- [ ] **Step 6: Implement reduced motion, zoom/reflow, and focus styles**

Use `@media (prefers-reduced-motion: reduce)` to disable nonessential transitions. Use fluid sizing and no fixed content widths that cause 320 px horizontal overflow. Focus outlines must be at least 3 CSS px and visible against adjacent colours.

- [ ] **Step 7: Run component tests**

Run: `npm test -- apps/web/src`
Expected: PASS with no axe violations in tested states.

- [ ] **Step 8: Commit**

```bash
git add aditunis/apps/web
 git commit -m "feat(aditunis): build accessible call workspace"
```

---

### Task 8: Wire accessible message provenance, confirmation, quick phrases, and fallback states into the UI

**Files:**
- Modify: `aditunis/apps/web/src/hooks/useCallSession.ts`
- Modify: `aditunis/apps/web/src/components/MessageComposer.tsx`
- Modify: `aditunis/apps/web/src/components/ConfirmationPanel.tsx`
- Modify: `aditunis/apps/web/src/components/QuickPhraseGrid.tsx`
- Modify: `aditunis/apps/web/src/components/CallControls.tsx`
- Modify: `aditunis/apps/gateway/src/routes/calls.ts`
- Test: `aditunis/apps/web/src/call-flow.test.tsx`
- Test: `aditunis/apps/gateway/src/communication.test.ts`

**Interfaces:**
- Consumes: communication provenance and confirmation policy.
- Produces: user-confirmed message transmission and plain-language fallback state.

- [ ] **Step 1: Write failing low-confidence inference test**

Render a call state with model inference `Can you bring my bag?` at `0.63` confidence. Assert the UI displays `YES, SAY THIS`, `EDIT`, `OTHER OPTIONS`, and `TRY AGAIN`, and assert the API client has not called `sendText`.

- [ ] **Step 2: Implement confirmation state**

A low-confidence model result lives in local/pending state until the user confirms. On confirmation, preserve:

```ts
{
  expressed: null,
  inferred: 'Can you bring my bag?',
  transmitted: 'Can you bring my bag?',
  source: 'user_confirmed',
  confidence: 0.63,
}
```

- [ ] **Step 3: Write failing direct-input test**

Type `Please wait` into the composer and send. Assert the payload source is `direct_user_input`, confidence is `1`, and no model confirmation is inserted.

- [ ] **Step 4: Implement quick phrases using the same send pipeline**

Quick phrases are not a second telephony path. Selecting one produces an `aac_selection` provenance object and invokes the same provider-neutral send endpoint.

- [ ] **Step 5: Implement `STOP_OUTPUT` and fallback messages**

The Stop Output button is always reachable during synthetic playback. Provider/media failures surface plain-language messages such as `Voice is unavailable. Text communication is still working.` and do not disable the composer or quick phrases.

- [ ] **Step 6: Run call-flow tests**

Run: `npm test -- apps/web/src apps/gateway/src`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add aditunis/apps/web aditunis/apps/gateway
 git commit -m "feat(aditunis): preserve authorship in accessible call flow"
```

---

### Task 9: Add TextTransport sandbox and future RTT/V.18 boundaries

**Files:**
- Create: `aditunis/packages/call-core/src/sandbox-text-transport.ts`
- Modify: `aditunis/packages/call-core/src/call-service.ts`
- Modify: `aditunis/apps/gateway/src/routes/calls.ts`
- Test: `aditunis/packages/call-core/src/sandbox-text-transport.test.ts`
- Create: `aditunis/docs/RTT_TTY_ADAPTER_BOUNDARY.md`

**Interfaces:**
- Consumes: `TextTransport`, `TextOperation`.
- Produces: working sandbox text flow and documented adapter contract for T.140/RFC 4103 and V.18.

- [ ] **Step 1: Write failing TextTransport tests**

```ts
it('preserves append/delete operations in order', async () => {
  const transport = new SandboxTextTransport();
  await transport.send('adt_call_1', { kind: 'append', text: 'Can ' });
  await transport.send('adt_call_1', { kind: 'append', text: 'you' });
  await transport.send('adt_call_1', { kind: 'delete', count: 3 });
  expect(transport.operationsFor('adt_call_1')).toEqual([
    { kind: 'append', text: 'Can ' },
    { kind: 'append', text: 'you' },
    { kind: 'delete', count: 3 },
  ]);
});
```

- [ ] **Step 2: Implement the sandbox transport**

It stores operations in memory for tests only and reports `nativeRtt: false`, `tty: false`, `sandboxText: true` capabilities.

- [ ] **Step 3: Document the future adapters**

`RTT_TTY_ADAPTER_BOUNDARY.md` must specify that a future RFC 4103 adapter implements the same `TextTransport`; a V.18 adapter converts text operations to/from legacy TTY signalling. Neither change is allowed to alter the web client contract.

- [ ] **Step 4: Run tests and commit**

Run: `npm test -- packages/call-core/src`

```bash
git add aditunis/packages/call-core aditunis/docs
 git commit -m "feat(aditunis): add RTT-ready text transport boundary"
```

---

### Task 10: Add browser accessibility E2E coverage, CI, documentation, and verification

**Files:**
- Create: `aditunis/e2e/playwright.config.ts`
- Create: `aditunis/e2e/accessible-call.spec.ts`
- Modify: `aditunis/package.json`
- Create: `.github/workflows/aditunis-ci.yml`
- Create: `aditunis/README.md`
- Create: `aditunis/.env.example`

**Interfaces:**
- Consumes: complete prototype.
- Produces: repeatable automated verification and developer setup.

- [ ] **Step 1: Write the Playwright accessibility-flow test**

The browser test must:

1. open the sandbox workspace at 1280 px;
2. create a sandbox call using keyboard only;
3. send a direct typed message;
4. select the `Please wait` quick phrase;
5. inject a low-confidence inference fixture and confirm it;
6. activate Stop Output;
7. end the call through the deliberate confirmation flow;
8. repeat the page at a 320 px viewport and verify `document.documentElement.scrollWidth <= window.innerWidth`;
9. verify the call state remains visible while the confirmation panel is open.

- [ ] **Step 2: Add scripts**

Root scripts must include:

```json
{
  "dev:gateway": "npm run dev -w @aditunis/gateway",
  "dev:web": "npm run dev -w @aditunis/web",
  "test:e2e": "playwright test -c e2e/playwright.config.ts",
  "verify": "npm run lint:types && npm test && npm run build && npm run test:e2e"
}
```

- [ ] **Step 3: Add CI**

`.github/workflows/aditunis-ci.yml` runs on pull requests that touch `aditunis/**` or the workflow itself, uses Node 22, `npm ci` from `aditunis/`, installs Playwright Chromium, then runs `npm run verify`. CI does not require Twilio credentials; all provider tests use mocks/fake provider.

- [ ] **Step 4: Document environment and live Twilio test procedure**

`.env.example` lists names only, never secrets:

```text
ADITUNIS_PROVIDER=fake
ADITUNIS_PUBLIC_BASE_URL=https://example.invalid
TWILIO_ACCOUNT_SID=
TWILIO_API_KEY=
TWILIO_API_SECRET=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
TWILIO_MEDIA_WSS_URL=
```

README states that real calls are opt-in by setting `ADITUNIS_PROVIDER=twilio` and configuring a permitted test destination; emergency numbers remain blocked.

- [ ] **Step 5: Run complete verification**

Run:

```bash
cd aditunis
npm run verify
```

Expected: type checking PASS, unit/contract/accessibility tests PASS, build PASS, Playwright E2E PASS.

- [ ] **Step 6: Verify no secrets or accidental recording configuration**

Run:

```bash
git grep -nE 'TWILIO_(AUTH_TOKEN|API_SECRET)=[^[:space:]]+' -- aditunis ':!aditunis/.env.example' && exit 1 || true
git grep -nE 'record[=:][[:space:]]*(true|"true")' -- aditunis && exit 1 || true
```

Expected: no matches that indicate committed credentials or default call recording.

- [ ] **Step 7: Commit**

```bash
git add aditunis .github/workflows/aditunis-ci.yml
 git commit -m "test(aditunis): add accessibility verification and CI"
```

---

## Final Verification Gate

Before claiming implementation complete:

```bash
cd aditunis
npm ci
npm run verify
```

Then inspect:

```bash
git status --short
git diff main...HEAD --stat
```

Required evidence:

- clean working tree;
- complete test pass;
- build pass;
- E2E accessibility flow pass;
- no real emergency-call path;
- no committed credentials;
- recording disabled by default;
- fake provider can replace Twilio without UI/call-core changes.

Only after this gate should a draft pull request be opened against `main` for review. Do not merge automatically.