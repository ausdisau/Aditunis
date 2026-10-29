# External service adapters — disabled by default

## Hugging Face
Metadata-only research comparators:
- https://huggingface.co/openai/whisper-small — Whisper-small; check current weights/licence before use
- https://huggingface.co/jmaczan/wav2vec2-large-xls-r-300m-dysarthria — wav2vec2 dysarthria research model
- https://huggingface.co/datasets/birgermoell/synthetic_dysathria — synthetic examples, NOT consented substitutes for CP recordings
- https://huggingface.co/datasets/changelinglab/easycall-dysarthria — Italian, CC BY-NC 2.0

Weights have **not** been loaded, benchmarked or trained. Use an isolated inference service with documented model version, audited tenant credentials, explicit purpose/region selection and real participant consent after necessary approvals. Never embed Hugging Face keys in Expo builds. A public mobile app must not directly call an unauthenticated inference service containing health data.

## VoiceLabs
Connected VoiceLabs account has a built-in Kokoro preset named **SpeechPrint AAC Preset**, provisioned as a demonstration voice. It is **not** a clone of a participant, not dysarthria-adapted, and not connected to the mobile app. VoiceLabs remote transcription (Whisper) is available only with user-directed input and separate external-provider consent. This prototype does not send audio to VoiceLabs.

## Desktop reviewer
The Vue/Tauri review app is intentionally an **offline, metadata-only** demonstration. Avoid any upload, private transcript or sensitive clinical record in its text area. On desktop, run review tooling on approved pseudonymous summaries only; do not confuse the OpenManikin clinical simulation engine with an ASR diagnostic authority.

## Native bridge
The React Native application is the primary mobile shell. The Vue/Tauri app is a *separate* optional desktop viewer; its runtime does not share a database with the mobile app. Future secure exports must require independently reviewed identity, audit, encryption, consent, access and retention controls.

## Research and policy provenance
The Disability Policy Repository guides **provenance recording**, not diagnostic metadata. Proposed sources for legal review:
- https://www.legislation.gov.au/C2004A03712/latest/text (Privacy Act 1988)
- https://www.oaic.gov.au/privacy/australian-privacy-principles (Australian Privacy Principles)
- https://www.legislation.nsw.gov.au/view/html/inforce/current/act-2002-071 (NSW Health Records and Information Privacy Act 2002)

All legal conclusions require current jurisdiction-specific expert review. Official policy source metadata should be tagged CANONICAL / PROBABLE / CANDIDATE / RESEARCH and must never alter participant consent.
