# SpeechPrint v0.1 implementation (experimental)

**Status:** source scaffold committed for review. Native Expo app, encryption, SQLCipher configuration, Tauri packaging and dependency compatibility remain **unverified on physical devices**. Do not enrol actual participants until verified and approved.

## Components
- **Corpus:** Expo React Native app with purpose-specific local recording consent, microphone recording, encrypted per-file audio vault and SQLCipher metadata; private typed transcript verification and deletion.
- **Personal:** explicit local text lexicon and device-provided text-to-speech with stop control; no neural adaptation.
- **Guardian:** pure TypeScript rights gate, append-only consent events, opt-in per purpose, tests for denial/withdrawal and disjoint research permissions.
- **Evaluation:** offline Python scorer on **already approved** prediction JSONL; WER/CER by speaker with cross-split overlap rejection. No audio or model inference.
- **Desktop:** Vue + Vite + minimal Tauri configuration for metadata-only review. Native packaging needs rust toolchain and Tauri initialization, so it is a scaffold, not a prebuilt installer.

## Run locally
Use Node.js compatible with the installed Expo SDK. Install from \`speechprint/\`:

\`\`\`bash
npm install
npm run test:core
npm run typecheck:core
npm run dev:mobile
\`\`\`

Use an **Expo native development build**, **not Expo Go**, because SQLCipher is required. Run \`npm --workspace @adtunis/speechprint-mobile run android\` or \`run ios\` on a supported host with Android Studio/Xcode. Check Expo SDK 58 published package matrix and run \`npx expo install --check\`; use \`npx expo install --fix\` as appropriate. No release APK/IPA is provided.

For the separate desktop research reviewer:

\`\`\`bash
npm run dev:review
\`\`\`

For example evaluation (no ML dependency):
\`\`\`bash
python3 evaluation/evaluate_asr.py evaluation/examples.synthetic.jsonl
python3 -m pytest evaluation/test_evaluate.py
\`\`\`

## Limitations and mandatory checks
1. **Security**: independently verify Expo Crypto AES-GCM and SQLCipher native behavior, filesystem race safety, secure key storage across device restores, audio plaintext cache cleanup, memory clearing and crash recovery. No general guarantee of secure erasure on flash media; device backups require explicit audit. Re-audit mobile module behavior against Expo's current API before using the recorder in research.
2. **Consent**: UI preference grants are prototype controls, not legally sufficient informed research consent. Add accessible comprehension, signed/verified consent, supporter boundaries, HREC review and paper/offline alternatives. Never show an unimplemented third-party transcription preference as proof that processing was approved.
3. **Data protection**: no server, identity service, cloud vault or automatic upload exists. Disable telemetry and crash uploads containing transcripts. All participant data remains out of git; do not use GitHub or Hugging Face as a raw-audio store.
4. **Evaluation**: the scorer normalises case and punctuation, not language-specific spelling conventions; WER/CER alone do not measure functional communication. Add speaker-disjoint stratification, prospective sessions, critical command false accept/reject, disaggregated metrics and error confidence intervals.
5. **Accessibility**: screen-reader labels, large controls and typed AAC fallback are beginnings only. Validate switch access, eye gaze, alternative input, captions, focus order, voice stop, cognitive accessibility and WCAG 2.2 AA with real users.
6. **Model integration**: no fine-tuning, ASR inference, model weights, training data, remote transcription or automatic classification is implemented.
7. **UX**: secure audio playback needs a controlled temporary decrypt/read/delete flow and is intentionally excluded until audio security can be verified. Every record is independent of its prompt.
8. **Platform**: desktop viewer is not integrated with OpenManikin physiological simulation; policy provenance is documentary, not clinical authority.

## Guardian public ledger
- Decision: **ALLOW_WITH_SAFEGUARDS** for developing local-only consent and accessibility scaffolding.
- Decision: **HOLD_BRANCH** for external transcription, audio sharing, research training, or public deployment without consent/rights/security approvals.
- People affected: people with CP and dysarthria, family and carers acting without assumed authority, SLP reviewers, researchers and operators.
- Tension: larger research datasets could improve recognition but also amplify privacy, biometric misuse, coercion and representational imbalance.
- Less restrictive option: participant-controlled local-only capture and corrections, no third-party transfer by default.
- Evidence and unknowns: real cohort speech performance, supplier contract, HREC basis, data rights, on-device implementation validation, and production security remain unknown.
- Accountable owner: named human investigator and disabled co-design governance board; no automated self-approval.
