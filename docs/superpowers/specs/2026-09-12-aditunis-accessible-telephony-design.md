# Aditunis Accessible Telephony Gateway — Design Specification

**Date:** 2026-09-12  
**Status:** Approved design, pending implementation-plan review  
**Repository:** `ausdisau/project-euphonia-audiotool`  
**Branch:** `feature/aditunis-accessible-telephony`

## 1. Purpose

Aditunis is an accessibility-first communication system for people whose speech, motor access, gaze, gesture, or other communication methods are not reliably supported by mainstream telephony interfaces.

This specification defines a prototype machine-to-machine telephony interface and accessible call workspace that connects Aditunis to Australian telephone and VoIP services through Twilio first, while preserving a provider-neutral architecture for future Optus, Telstra, standards-native RTT, and V.18/TTY adapters.

The success criterion is not merely that a call connects. The prototype succeeds when a person can independently start, receive, understand, control, correct, and end a telephone conversation with low physical and cognitive effort while retaining authorship over what is transmitted.

## 2. Design principles

1. **Accessibility is runtime infrastructure, not decoration.** Input adaptation, timing, confirmation, output adaptation, and fallback behaviour sit between the user and the telephony layer.
2. **The person remains the author.** The system must distinguish what the person expressed, what Aditunis inferred, and what was actually transmitted.
3. **AI is optional to basic communication.** Core call control, typed/AAC communication, quick phrases, captions, and call termination must continue when AI components are unavailable.
4. **Telephony complexity stays behind the gateway.** The Aditunis client never needs to understand SIP, SDP, RTP, TwiML, Twilio Call SIDs, or carrier-specific behaviour.
5. **Minimum necessary disclosure.** Twilio and later carriers receive only routing, signalling, media, and communication payloads required to provide the call. Speech-phenotype data, gaze data, gesture data, personal embeddings, correction history, and model reasoning remain within Aditunis.
6. **No silent accessibility downgrade.** If a requested communication mode becomes unavailable, the user is told what changed and what remains available.
7. **No emergency calling in V0.1.** Calls to Australian emergency access numbers `000`, `106`, and `112` are blocked by policy in the prototype until a separate emergency-communications design, regulatory review, and carrier testing are complete.
8. **WCAG 2.2 AA is the minimum; motor-access usability exceeds minimum conformance where practical.**

## 3. Existing repository boundary

The existing Project Euphonia `audiotool/` remains a reference/data-collection application. It is not rewritten as part of this prototype.

A new sibling workspace will be added under `aditunis/` so the new runtime can evolve without destabilising the legacy Firebase/Google Cloud collector.

```text
project-euphonia-audiotool/
├── audiotool/                     # existing Project Euphonia collector
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
└── aditunis/                      # new prototype workspace
    ├── apps/
    │   ├── web/                   # accessible call workspace
    │   └── gateway/               # REST/WS + Twilio adapter
    └── packages/
        ├── contracts/             # provider-neutral API/event types
        ├── accessibility-runtime/ # communication profile + policies
        ├── call-core/             # deterministic call state machine
        └── twilio-adapter/        # Twilio-specific translation
```

The new workspace uses TypeScript and is independently buildable and testable.

## 4. V0.1 scope

### Included

- Accessible browser call workspace.
- REST control plane and WebSocket event plane.
- Deterministic call state machine.
- Twilio Programmable Voice outbound call integration.
- Twilio inbound-call webhook integration.
- Twilio status callback translation.
- Twilio bidirectional Media Streams bridge boundary.
- Text-to-speech output hook and audio interruption/clear behaviour.
- Remote audio/caption event hooks.
- Communication profiles for timing, preferred input/output, captions, and confirmation behaviour.
- Accessible quick phrases.
- User confirmation flow for uncertain inferred communication.
- Explicit expressed/inferred/transmitted provenance.
- Provider adapter abstraction.
- RTT/TextTransport abstraction with a sandbox implementation; Twilio native RFC 4103/T.140 support is not assumed.
- Future V.18/TTY adapter interface, without physical TTY hardware in V0.1.
- Sandbox/test mode that works without placing live calls.
- Security controls for signed Twilio webhooks, scoped credentials, rate limiting, and no recording by default.

### Excluded from V0.1

- Emergency calling.
- Physical TTY hardware.
- Production carrier contracts with Optus or Telstra.
- Diagnostic classification.
- Automatic retraining of speech models.
- Payment/financial call automation.
- Call recording by default.
- Twilio Conversation Memory as a store for phenotype or disability data.
- LLM access to raw SIP/RTP controls.

## 5. System architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                       ADITUNIS WEB                            │
│                                                               │
│  Call workspace  • captions • quick phrases • correction      │
│  touch • keyboard • switch • gaze-ready semantic controls     │
└──────────────────────────┬────────────────────────────────────┘
                           │ HTTPS REST + WSS events
                           ▼
┌───────────────────────────────────────────────────────────────┐
│                ACCESSIBILITY RUNTIME                          │
│                                                               │
│ communication profile • timing • confirmation • fallback      │
│ output adaptation • semantic action mapping                   │
└──────────────────────────┬────────────────────────────────────┘
                           │ provider-neutral commands/events
                           ▼
┌───────────────────────────────────────────────────────────────┐
│                    CALL CORE                                  │
│                                                               │
│ deterministic state machine • policy • provenance • audit     │
└──────────────────────────┬────────────────────────────────────┘
                           │ ProviderAdapter
                           ▼
┌───────────────────────────────────────────────────────────────┐
│                   TWILIO ADAPTER                              │
│                                                               │
│ Calls API • TwiML • webhooks • status callbacks • media WS    │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
                   Twilio AU voice/SIP
                           │
                   ┌───────┴────────┐
                   ▼                ▼
                 PSTN             SIP/VoIP
```

A future `OptusAdapter`, `TelstraAdapter`, or standards-native `RttSipAdapter` implements the same `ProviderAdapter` contract.

## 6. Stable machine-to-machine contract

### 6.1 REST control plane

The gateway exposes `/v1` endpoints with provider-neutral behaviour:

```text
POST   /v1/calls
GET    /v1/calls/:callId
POST   /v1/calls/:callId/answer
POST   /v1/calls/:callId/end
POST   /v1/calls/:callId/text
POST   /v1/calls/:callId/mode
POST   /v1/calls/:callId/dtmf
GET    /v1/calls/:callId/capabilities
GET    /v1/providers
GET    /v1/health
```

Every mutating request accepts an idempotency key. Repeating a request with the same key returns the original logical result instead of duplicating the call/action.

### 6.2 Event plane

`wss://<gateway>/v1/events` carries ordered events with a monotonically increasing per-call sequence:

```ts
interface AditunisEvent<T = unknown> {
  eventId: string;
  callId: string;
  type: string;
  sequence: number;
  timestamp: string;
  payload: T;
}
```

Core events:

```text
call.created
call.authorised
call.dialing
call.ringing
call.connected
call.held
call.resumed
call.ended
call.failed
media.audio.started
media.audio.stopped
media.degraded
media.restored
text.received
text.sent
capabilities.updated
mode.requested
mode.changed
mode.degraded
access.confirmation_required
access.confirmation_resolved
provider.connected
provider.degraded
provider.failed
```

WebSocket loss does not itself terminate a call. The client reconnects with its last received sequence and requests replay of recoverable state/events.

## 7. Call state machine

The call lifecycle is deterministic and not controlled by an LLM.

```text
NEW
 → AUTHORISING
 → DIALING
 → RINGING
 → CONNECTED
 → ACTIVE
 → TERMINATING
 → ENDED
```

Additional non-terminal states:

```text
HELD
DEGRADED
RECONNECTING
```

Terminal failure reasons:

```text
BUSY
REJECTED
NO_ANSWER
AUTH_FAILED
PROVIDER_FAILED
UNSUPPORTED_MEDIA
POLICY_BLOCKED
```

Twilio states are translated into this model inside `twilio-adapter`; no Twilio-specific state leaks into the web client.

## 8. Communication provenance

Every outgoing message contains three explicit representations:

```ts
interface CommunicationProvenance {
  expressed: string | null;
  inferred: string | null;
  transmitted: string | null;
  source:
    | 'direct_user_input'
    | 'aac_selection'
    | 'user_confirmed'
    | 'model_inferred'
    | 'model_generated'
    | 'system_message';
  confidence: number | null;
}
```

Rules:

- Direct typing/AAC selection can be transmitted immediately when the user has configured that behaviour.
- Low- or medium-confidence model inference requires confirmation according to the communication profile.
- Aditunis never alters `expressed` retrospectively to make it match `transmitted`.
- Audit events store provenance metadata without storing raw phenotype embeddings.

## 9. Accessibility runtime

### 9.1 Communication profile

The profile describes how the person uses the system, not why.

```ts
interface CommunicationProfile {
  id: string;
  preferredInputs: Array<'speech' | 'touch' | 'keyboard' | 'switch' | 'gaze'>;
  preferredOutputs: Array<'audio' | 'captions' | 'text' | 'tts'>;
  captionsAlwaysOn: boolean;
  responseTimeoutMs: number | null;
  gazeDwellMs: number;
  switchScanIntervalMs: number;
  speechPauseToleranceMs: number;
  confirmationThreshold: number;
  largeTargets: boolean;
  reduceMotion: boolean;
  quickPhraseIds: string[];
}
```

Default prototype settings:

- `responseTimeoutMs = null` for the local accessibility UI; no user response is cancelled merely because they are slow.
- `gazeDwellMs = 650`.
- `switchScanIntervalMs = 1200`.
- `speechPauseToleranceMs = 1800`.
- `confirmationThreshold = 0.80`.
- `captionsAlwaysOn = true`.
- `largeTargets = true`.
- `reduceMotion` honours the browser preference and may be explicitly enabled.

These are user-configurable, not diagnostic defaults.

### 9.2 Semantic actions

All input modalities invoke the same semantic actions:

```text
START_CALL
ANSWER_CALL
END_CALL
SEND_MESSAGE
CONFIRM_MESSAGE
EDIT_MESSAGE
CANCEL_MESSAGE
STOP_OUTPUT
REPEAT_REMOTE
SLOW_REMOTE
TOGGLE_CAPTIONS
OPEN_KEYBOARD
SELECT_QUICK_PHRASE
```

Touch, gaze, switch, keyboard, and speech adapters map onto these actions. Business logic must never branch on disability or input device when the semantic intention is the same.

### 9.3 Adaptive confirmation

Confirmation burden is minimised while preserving authorship.

- Confidence >= profile threshold and action is ordinary conversation: transmit using configured behaviour.
- Confidence below profile threshold: present a confirmation surface.
- Consequential actions such as ending a call, sending DTMF into sensitive services, enabling recording, or bridging a third party use explicit confirmation regardless of model confidence.
- The user can configure a stricter policy.

## 10. Accessible interaction layout

### 10.1 Visual language

The Aditunis UI inherits the Australian Disability Ltd family resemblance:

- blue → purple → orange gradient is used for brand accents, not for critical state meaning;
- white or very light neutral primary surfaces;
- high-contrast charcoal text;
- rounded geometric components;
- the Aditunis mark is displayed in the application header;
- focus, error, connected, muted, and degraded states use text/icon labels as well as colour.

Primary interaction components use solid accessible fills rather than gradient text where gradients would reduce readability.

### 10.2 Main call workspace

Desktop/tablet layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ [Aditunis]  Sarah                         Connected • 04:37  │
│              Voice + captions              [Settings]        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  CONVERSATION                                                │
│                                                              │
│  Sarah                                                       │
│  Are you ready to leave?                                     │
│                                                              │
│  You                                                         │
│  Yes, but can you bring my jacket?                            │
│                                                              │
│  Live caption / transcript region remains stable             │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  YOUR MESSAGE                                                │
│                                                              │
│  [ recognised / typed message editing surface              ] │
│                                                              │
│  [ Speak / Look / Type ]                                     │
│                                                              │
│  [ YES ]       [ NO ]       [ PLEASE WAIT ]       [ MORE ]  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ [Repeat] [Slow audio] [Keyboard] [Stop output] [End call]   │
└──────────────────────────────────────────────────────────────┘
```

Rules:

- The call state and remote participant remain visible at all times.
- The conversation region does not disappear when a keyboard, correction chooser, or quick-phrase panel opens.
- Primary call controls are never hidden behind hover-only interaction.
- Destructive actions require a deliberate second step but never a tiny modal target.
- Primary interactive targets are at least `64 × 64 CSS px`; secondary targets are at least `48 × 48 CSS px`.
- Text scales to 200% without clipping, loss of controls, or horizontal page scrolling at a 320 CSS px viewport.
- Keyboard focus is strongly visible and follows the visual reading order.
- Status updates use an ARIA live region with restrained verbosity; incoming captions are not repeatedly re-announced as full accumulated paragraphs.

### 10.3 Confirmation surface

Low-confidence inference appears in-place rather than blocking the whole call:

```text
┌──────────────────────────────────────────────────────────────┐
│ I heard:                                                     │
│                                                              │
│ “Can you bring my bag?”                                      │
│                                                              │
│ [ YES, SAY THIS ]                                            │
│ [ EDIT ]                                                     │
│ [ OTHER OPTIONS ]                                            │
│ [ TRY AGAIN ]                                                │
└──────────────────────────────────────────────────────────────┘
```

The choices support touch, keyboard, switch scanning, and gaze dwell through the same semantic actions.

### 10.4 Quick phrases

Default quick phrases:

- Yes.
- No.
- Please wait — I use assistive communication and need more time to respond.
- I am still speaking.
- Please do not hang up.
- Can you repeat that?
- That is not what I meant.
- I need to type this.

Automatic use of a delay phrase is **off by default** and requires explicit user opt-in.

### 10.5 Mobile layout

On narrow screens:

- participant/status remains sticky at the top;
- composer/quick actions remain reachable near the bottom;
- transcript occupies the flexible middle region;
- no essential action relies on a swipe gesture;
- an alternate single-switch scanning mode presents one actionable group at a time without changing semantic action IDs.

## 11. Twilio implementation boundary

### 11.1 Calls and webhooks

`TwilioProviderAdapter` implements the provider contract using Twilio Programmable Voice.

Responsibilities:

- create outbound calls;
- handle inbound call webhooks;
- return TwiML;
- map Twilio lifecycle callbacks into Aditunis events;
- associate `CallSid` with an internal `callId`;
- never expose Twilio credentials or provider IDs to the browser.

### 11.2 Media Streams

The adapter exposes an internal media WebSocket separate from the public Aditunis event WebSocket.

```text
Twilio media WS: provider transport only
Aditunis event WS: application state only
```

Inbound Twilio telephony audio is decoded from 8 kHz μ-law into PCM for internal processing. Custom Aditunis audio returned to Twilio is resampled/encoded back to the format required by the media stream.

Playback control supports a provider-neutral `STOP_OUTPUT` action that maps to Twilio buffer-clear behaviour.

### 11.3 ConversationRelay

ConversationRelay may be implemented as an experimental comparator for generic ASR/TTS versus Aditunis custom speech processing. It is not a dependency of the core personalised speech path.

### 11.4 Agent Connect / MCP

Twilio Agent Connect may later provide multi-channel middleware for SMS/RCS/WhatsApp/voice integrations. Twilio MCP is a development-time aid for API discovery and does not sit in the communication path.

## 12. Text, RTT, and future TTY

The call core exposes `TextTransport` independently from the provider adapter.

```ts
interface TextTransport {
  capabilities(): Promise<TextTransportCapabilities>;
  send(callId: string, operation: TextOperation): Promise<void>;
  close(callId: string): Promise<void>;
}
```

V0.1 implements a sandbox text transport for end-to-end UI testing.

A future standards adapter can implement T.140/RFC 4103 when a carrier/SBC path is confirmed. A later V.18 adapter converts between Aditunis text operations and legacy TTY signalling without changing the web client or call-core API.

## 13. Failure and fallback behaviour

Failures are described to the user in communication terms, not infrastructure jargon.

Examples:

- `provider media unavailable` → **Voice is unavailable. Text communication is still working.**
- `custom ASR unavailable` → **Personal speech recognition is unavailable. You can type, use quick phrases, or switch to standard speech recognition.**
- `caption service unavailable` → **Captions are temporarily unavailable. Audio is still connected.**

Fallback order is capability-driven and user-configurable. A default V0.1 order is:

```text
personalised multimodal input
→ direct typing/AAC
→ quick phrases
```

for expression, and:

```text
remote audio + captions
→ remote audio only
→ remote text if available
```

for reception.

No fallback silently transmits a model inference that would otherwise require confirmation.

## 14. Security and privacy

- Production server-to-Twilio calls use revocable API key credentials, not credentials committed to source.
- Incoming Twilio webhooks are validated with the official Twilio SDK signature validator.
- Public webhook and WebSocket endpoints require TLS.
- Browser clients never receive Twilio Auth Tokens or API secrets.
- Call recording is disabled by default.
- Raw training data, gaze coordinates, gesture embeddings, phenotype records, and model reasoning are not sent to Twilio.
- Logs redact credentials and avoid storing call audio.
- Prototype destination policy defaults to Australia and explicit allowlisted test destinations.
- Emergency numbers `000`, `106`, and `112` are blocked before provider invocation.
- Rate limits apply per principal and per destination.

## 15. Data retained by the prototype

The prototype stores only what is needed for testability:

- internal call ID;
- provider call ID on the server;
- call state transitions;
- timestamps;
- negotiated capabilities;
- accessibility profile ID/reference;
- communication provenance text only when the user/test profile has opted into transcript retention;
- failure reason codes;
- non-content quality metrics.

Raw call audio is not persisted by default.

## 16. Test strategy

### Unit tests

- call-state transition legality;
- emergency-number policy;
- idempotency handling;
- Twilio-to-Aditunis state mapping;
- communication-provenance preservation;
- confirmation threshold logic;
- semantic action mapping;
- quick-phrase catalogue;
- profile defaults;
- media codec/packet conversion boundaries using fixtures;
- provider failure translation.

### Contract tests

- `ProviderAdapter` conformance;
- REST request/response schemas;
- ordered event replay;
- sandbox `TextTransport` operations;
- Twilio webhook signature rejection/acceptance using official validator fixtures.

### Accessibility tests

- keyboard-only complete call flow;
- screen-reader naming and state announcements;
- 200% zoom and 320 CSS px reflow;
- reduced-motion mode;
- high-contrast/focus visibility;
- switch-scanning semantic action order;
- gaze-dwell activation without hover dependency;
- extended-response timing without forced timeout;
- confirmation surface operable without fine motor precision.

### Integration tests

- sandbox outbound call lifecycle without Twilio credentials;
- mocked Twilio outbound call lifecycle;
- inbound webhook → call creation → event publication;
- media stream start/media/mark/clear/stop translation;
- WebSocket disconnect/reconnect state replay;
- provider failure while local typed/AAC interaction remains usable.

### Manual interoperability tests

After automated tests pass:

1. Twilio trial/test destination call.
2. Browser ↔ Australian test handset.
3. SIP softphone endpoint.
4. Remote-audio caption flow.
5. `STOP_OUTPUT` during synthetic speech.
6. Accessibility walkthrough with keyboard, touch target emulation, and switch/gaze simulation.

## 17. Prototype success metrics

The prototype records metrics aimed at communication usability rather than raw telephony volume:

- successful independent call setup rate;
- time to intended message;
- correction burden per transmitted message;
- unintended transmission rate;
- number of interactions required per message;
- fallback frequency;
- user-initiated stop/correction success;
- call abandonment after accessibility failure;
- communication recovery rate.

WER may be measured for speech-model experiments but is not the primary product success metric.

## 18. Implementation acceptance criteria

V0.1 is complete when all of the following are true:

1. The new `aditunis/` workspace builds independently of `audiotool/`.
2. A user can create a sandbox call from the accessible web UI without Twilio credentials.
3. The same UI can create a Twilio test call when valid server-side credentials and a permitted destination are configured.
4. Call state is shown in plain language and remains visible throughout the interaction.
5. Keyboard-only users can complete the full create/send/correct/end flow.
6. Primary controls meet the specified target sizes and 200%/320 px reflow requirements.
7. A low-confidence inferred message is never transmitted before confirmation.
8. Direct text/AAC input can bypass model inference.
9. `STOP_OUTPUT` interrupts queued synthetic output through the provider-neutral control path.
10. Provider failure does not disable local typed/AAC controls.
11. Twilio webhooks are signature-validated before they affect call state.
12. Browser code contains no Twilio API secret.
13. No call recording is enabled by default.
14. Calls to `000`, `106`, and `112` are rejected before provider invocation.
15. The Twilio adapter can be replaced by a fake provider in tests without modifying UI or call-core code.
16. The future T.140/RFC 4103 and V.18/TTY boundaries are represented by stable interfaces even though physical TTY hardware is not implemented.
17. Automated unit, contract, accessibility, and integration tests pass.

## 19. Deferred follow-on work

After V0.1 has been tested with disabled users and communication partners:

- standards-native T.140/RFC 4103 adapter;
- physical V.18/TTY gateway;
- Optus and Telstra carrier adapters;
- production AD.iD/OIDC authentication;
- personalised speech-model service integration;
- eye-gaze hardware adapter;
- switch hardware adapter;
- SMS/RCS/WhatsApp channels through Twilio Agent Connect where useful;
- formally governed emergency-communications project for 000/106, separate from ordinary telephony.

## 20. Central usability requirement

> The shortest path between a person's intended meaning and another human should require the least possible physical, cognitive, and communicative effort while preserving that person's authorship and control.

This requirement takes precedence over convenience features, vendor-specific abstractions, and model autonomy.