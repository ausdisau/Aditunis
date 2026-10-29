# Aditunis / SpeechPrint evidence reconciliation
Review date: 29 October 2026 (Australia/Sydney). Documentation correction; no production approval.

## Finding
The September specification combines intended architecture, external research figures and unsupported verification language. SpeechPrint PR #1 is a separate design/schema scaffold. These scopes do not establish a contradiction. No reviewed evidence establishes an Aditunis participant ASR result.

## Evidence register
| Claim | Classification | Evidence and qualification |
| --- | --- | --- |
| CER 29.46% to 13.74% | External author-reported measurement; not independently reproduced here | Matches Muller, Tóth & Roberts, arXiv:2609.02735v1, Table 1. One Hungarian-speaking post-stroke participant; 107 evaluation utterances; Hungarian-adapted Whisper-large-v3; single-seed DoRA. Section 3.6 calls this a reused benchmark, with fresh session-disjoint confirmation deferred. Does not establish CP/en-AU performance. |
| 115 MB DoRA | Misattributed external configuration | Table 1 gives 65.1 MB for that DoRA result. Table 8's 115 MB is feed-forward-extended LoRA. Neither is an Aditunis artifact. |
| Bounded-agency integrated testing completed | Unsubstantiated at claimed scope | September CI verifies telephony and ML software tests, not fiscal-limit interception or fatigue/DoRA integration. |
| Fatigue index, acoustic thresholds 0.78–0.45 and semantic weights 0.15–0.70 | Untested design parameters | No reviewed calibration study, fitted model, outcome record or matching implementation. |
| AUD 150 transaction / AUD 300 daily caps | Proposed product-policy settings | Specification supplies no statutory citation. Do not describe as legal requirements or tested protections. |
| SpeechPrint taxonomy, schemas, synthetic examples, model plan | Repository artifacts inspected | PR #1 head c9ead337e7e81b8f6d9730098fe72a47a51dfbcf contains these artifacts; schema presence does not demonstrate runtime enforcement. |
| No recordings/training/evaluation | Scope qualification needed | PR #1 adds metadata only. Main and PR trees already contain inherited WAV sample paths. No recordings were opened or imported for this review. Absence of Aditunis evaluation evidence is not proof no experiment exists elsewhere. |

The external paper is a matching source, not proof of the September document author's citation path. The specification has no bibliography entry, experiment ID or run link for its figures. Do not relabel those figures as internally achieved results or silently convert them into performance targets.

## Repository and experimental records
Pinned sources:
- [SpeechPrint PR #1](https://github.com/ausdisau/Aditunis/pull/1), open/draft at review; head c9ead337e7e81b8f6d9730098fe72a47a51dfbcf; base e95929a107ab3b477a3b541e26094e878e7bca01.
- [September speech/control specification](https://docs.google.com/document/d/1izZzDGubKXbapt3OiqFAA8SqmOKUGapKKXn6px6Fi7I/edit), created 22 September; revision 1 was a title placeholder, revision 2 supplies the substantive claims. Revision metadata identifies document editing, not experimental execution.
- [20 September platform specification](https://docs.google.com/document/d/1AEaVOdTt4I0jCHNRFh4TAPWJyETamg2gMOEvGQss7pQ/edit) also contains the CER/adapter assertion. It is another assertion, not independent corroboration; proposed wording below applies to it too.
- [External research](https://arxiv.org/html/2609.02735v1), sections 3.1–3.7, Tables 1, 2, 8 and section 6. Reading aggregate findings supplies no rights to restricted participant material.

Historical CI verified by reading job logs:
| Run | Pinned commit / branch | Observed result | What it establishes |
| --- | --- | --- | --- |
| [34683003751](https://github.com/ausdisau/Aditunis/actions/runs/34683003751) | 4e0a04daec9ce3c26114498e04f398ceabeb0cfc / feature/aditunis-accessible-telephony | 86 tests in 23 files passed; type check passed | Telephony contracts, gateway/provider simulations, call lifecycle, destination policy, idempotency, confirmation and related software behavior |
| [34687297195](https://github.com/ausdisau/Aditunis/actions/runs/34687297195) | 9f91f62a51a4080322643ddc43a72f934b863c4c / feature/aditunis-speech-training | 35 ML unit tests passed | Policy, registry/runtime boundaries, metric utilities and adapter software; not participant speech accuracy |

The ML workflow runs lightweight pytest tests without model-weight downloads. Its metric tests use toy strings/tokenizer stubs. Confirmation tests cover selected low-confidence/consequential-action decisions; call-service tests use FakeProviderAdapter. These are useful bounded software checks, not end-to-end proof of the September five-tier financial mandate engine. The reviewed ML run exposes no downloadable artifacts. Test successes are historical observations; no tests were rerun for this documentation change.

All five listed branch tips were considered. Main and feat/mapable-voice-vertical-slice share the upstream Euphonia base; PR #1 adds SpeechPrint; the telephony and training branches contain separate development. Their code is not present in PR #1's tree. The training tree includes the telephony work; 90 text source/config/design files under aditunis/ and docs/superpowers/ were inspected and searched for the numerical claims, DoRA, fatigue, mandates, fiscal limits and transactions. No corresponding fiscal/DoRA-fatigue implementation or experiment record was found there. No matching Aditunis app/project appeared in the selected Replit/Vercel name searches; that limited result does not establish absence in other accounts or names.

## Precise replacement wording
Apply alongside the original section structure; keep architecture and research objectives.

- Executive summary: “Aditunis proposes personalised speech recognition and participant-directed bounded agency. SpeechPrint v1 currently supplies a taxonomy, schemas, synthetic metadata and a research plan; it does not establish an evaluated speech recogniser or completed integrated control system.”
- Model backbone / personal adapter: “Frozen shared ASR bases and opt-in personal adapters remain candidate architecture. Whisper-large-v3 and DoRA/LoRA are research options. SpeechPrint currently proposes Whisper-small and a dysarthria wav2vec2 comparator for baseline work. Runtime choice, adapter footprint and on-device feasibility require measurement.”
- Accuracy: “The previously stated CER figures are external research context, not Aditunis measurements. See the evidence register for attribution, configuration and limitations. No reviewed Aditunis record establishes equivalent performance.”
- Fatigue: “An optional, participant-controlled context-adaptation experiment is proposed. Acoustic features do not by themselves validate a fatigue measure. Numerical thresholds and semantic weights are illustrative and uncalibrated. Semantic suggestions must remain visibly distinct from verbatim recognition and require user acceptance.”
- Bounded agency: “Observe, Inform, Recommend, Prepare and Act are intended mandate tiers. Low-confidence intent should remain unresolved until accessible clarification. The participant retains authority to confirm, correct, decline or stop.”
- Control plane: “AUD 150 per transaction and AUD 300 per day are illustrative configurable policy ceilings, subject to participant mandate and review. They are not established statutory limits. Provider allowlisting is intended, with implementation and verification pending.”
- Verification: “Historical feature-branch CI confirms the limited software tests listed above. No reviewed record substantiates financial-limit interception or integrated fatigue/adapter operation. Integration acceptance remains pending.”
- Standards: “CRPD Article 12 informs the design objective of supported decision-making; alignment is not a compliance certification or evidence that safeguards are implemented.”

For the 20 September platform specification's Voice item, replace its parenthetical performance/size assertion with “candidate personal adaptation; external research context only; no Aditunis performance or adapter-size measurement established.” Qualify present-tense capabilities across that document as intended until module-specific evidence is linked.

## Evidence required to change status
An internal ASR measurement needs a dated run ID and code commit, model/config revisions, rights-approved dataset manifest hash, purpose-specific consent status, partition rules, transcript verification, normalization/decoding/metric versions, counts and durations, per-speaker results and uncertainty, and reviewer sign-off. Keep identifying manifests/transcripts and consent artifacts private; publish only approved aggregates and opaque provenance references. Evaluate population generalisation with speaker-disjoint partitions and personalisation on later unseen sessions. A computational rerun is independent reproduction only when its procedure and access conditions support that claim.

Financial/control integration requires a real implemented policy engine and deterministic tests for exact boundaries, above-limit requests, cumulative spend, simultaneous requests, retries, cancellation/refunds, expired/revoked mandates, denied providers, uncertainty and failure behavior. Use simulated providers and synthetic requests first; preserve explicit confirmation and accessible stop controls. Passing these tests does not establish clinical effectiveness or certify all transactions safe.

Fatigue/context research needs voluntary self-report and agreed labels, confounder analysis, calibration, false activation and correction-burden measures. Do not increase autonomous authority when recognition worsens. Preserve AAC, keyboard/switch alternatives, pauses and user-selected verbatim/smoothed modes.

## Foundational requirements
Accessible purpose-specific consent separates daily use, evaluation and training; refusal or withdrawal must not remove baseline communication access. Do not infer identity, diagnosis, capacity or substitute intent from speech. Recordings, embeddings, personal adapters and transcripts may be identifying; keep them outside public Git and outside this audit. Enforce consent/rights at runtime as well as in metadata, support withdrawal/deletion with honest limits for distributed weights, and require privacy/ethics review before recruitment. No personal recordings imported, weights trained, evaluation invented, live transaction executed or production approval granted by this reconciliation.

