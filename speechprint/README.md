# SpeechPrint for Adtunis — research and implementation scaffold (v1)

> **Status: design + schemas only.** No participant audio has been imported. No ASR weights have been trained, deployed, or validated. This folder does not provide a medical diagnostic classifier.

## Purpose

SpeechPrint is an opt-in, speech-accessibility data and modelling layer for Adtunis. The first cohort focus is dysarthric speech among people with cerebral palsy (CP). Its objective is **accurate communication for an individual**, not classification of their disability from speech.

A person's clinical diagnosis, CP motor presentation, clinician-assessed dysarthria type, observed speech subsystem features, and real-world communication/access needs must be stored as *separate dimensions*. A person with CP may not have dysarthria. Speech impairment must not be used to presume cognitive impairment, incapacity, or the need to substitute another person's communication.

The term "SpeechPrint" means a revisable **communication phenotype** in this project, **not** a biometric identity credential, surveillance fingerprint, or clinical diagnosis. Public reports should aggregate without exposing identifiable voice embeddings.

## Design

```text
Consent + participant-selected capture
       |
Private encrypted audio vault -- separate private identity mapping
       |
Transcription / verification / provenance / quality gates
       |
SpeechPrint ontology + observed features + optional clinician context
       |
   [Shared ASR baseline] -> [CP/dysarthria adapter] -> [Opt-in personal adapter/lexicon]
       |
Captions, corrections, dictation, spoken commands, AAC fallback
```

Core speech domains: **articulation, phonation, prosody, resonance, respiration**. Record measurement method, label source, session, context and uncertainty for each acoustic or perceptual observation. Clinical labels are only recorded if voluntarily supplied with appropriate provenance. Do **not** map CP subtype to dysarthria subtype by rule.

Each profile is user-governed and may change across fatigue, positioning, illness, medications, device, background noise, language, context and time. Environmental context should improve recognition, not be represented as an individual's deficit.

## Files

- `ontology/speechprint-ontology.v1.json`: versioned multiple-axis taxonomic vocabulary.
- `schemas/profile.schema.json`: pseudonymised, optional-clinical-context SpeechPrint profile schema.
- `schemas/utterance.schema.json`: consent-/licensing-aware utterance metadata schema.
- `examples/profile.synthetic.json` and `examples/utterance.synthetic.json`: **invented metadata only**. There is no corresponding recording.
- `configs/model-plan.json`: research and engineering experiments, not a trained model.

Use JSON Schema Draft 2020-12 validation, followed by corpus-wide validation for consent status, rights review, sample duration, annotation consistency, duplicate recordings and speaker partition overlap. Schema validity does *not* prove rights clearance or research ethics approval.

## Speech sampling protocol (draft; review with disabled participants and SLPs)

- Read words and phonetically varied phrases; familiar high-value phrases; intentionally unusual names and personal vocabulary.
- Everyday commands; free response; natural conversation; repairs and self-corrections.
- Repeat opt-in sessions across time of day, devices, posture and ambient noise, without requiring fatigue-inducing or stressful tasks.
- Give AAC and non-speech alternatives, unlimited pauses and refusal/skip controls. Provide accessible informed consent and control over re-use.
- Record both prompted target and **what was actually said**, with verified transcripts and explicit uncertainty regions. Never automatically force a participant's speech to match a prompt.
- Obtain speaker-verified annotations where practicable, with qualified annotator second review and adjudication for ambiguous samples.

Pilot dataset target for planning only: 40-60 diverse consenting CP speakers, then expand to 150+ after a recruitment/feasibility review; target 30-60 minutes of *optional* varied recordings per speaker spread across sessions. These are **planning hypotheses**, not an observed sample size, minimum necessary recording duration or assurance of model performance. A smaller accessible pilot is preferable to coercive collection.

## Data sources and rights ledger

| Source | Relevance | Access / rights assessment |
|---|---|---|
| TORGO (University of Toronto) | Small aligned acoustic/articulatory dysarthria corpus involving CP and ALS | Verify the rights and study use from the custodian; public listing is **not** blanket training permission. |
| UA-Speech (University of Illinois) | CP-associated dysarthric speech; currently distributed recordings of 16 speakers | Government/academic researchers only; **no commercial use or redistribution** under stated original consent restrictions. |
| Speech Accessibility Project | ~1,500 hours and ~999 participants across several conditions in stated package | Separate data use agreement and review required; not unrestricted public data. |
| Hugging Face `birgermoell/synthetic_dysathria` | Research on synthetic dysarthric speech | Use only if licensing, source consent and representational fairness are checked. Never present generated accents or impairments as actual participants. |
| `changelinglab/easycall-dysarthria` | Italian dysarthric command speech | CC BY-NC 2.0 metadata; not a CP-specific cohort or automatically commercial-usable. |
| `jmaczan/wav2vec2-large-xls-r-300m-dysarthria` | Research ASR comparator (not a dataset) | Apache-2.0 model metadata, but training-source documentation incomplete. Independent external evaluation required. |

The Australian Institute of Health and Welfare CP reports are epidemiological/contextual sources, **not raw consented voice recordings**. Do not synthesize individual-level training labels from aggregate prevalence statistics.

Useful source URLs: 
- https://www.cs.toronto.edu/~complingweb/data/TORGO/torgo.html
- https://speechtechnology.web.illinois.edu/uaspeech/
- https://speechaccessibilityproject.beckman.illinois.edu/conduct-research-through-the-project
- https://www.asha.org/practice-portal/clinical-topics/dysarthria-in-adults/
- https://www.ncbi.nlm.nih.gov/books/NBK595706/
- https://huggingface.co/jmaczan/wav2vec2-large-xls-r-300m-dysarthria

## Baseline and training strategy (proposed)

1. Obtain rights-approved audio in private storage and signed/accessible purpose-specific consent; maintain a separate dataset/model usage ledger.
2. Make a read-only baseline with Whisper-small and the dysarthria-specific wav2vec2 candidate. Record WER, CER, keyword recall, command false activations, latency and correction burden for each held-out speaker.
3. Adapt a model using speaker-disjoint training/development/test partitions. Preserve adequate typical and other disordered speech so fine-tuning does not regress out-of-domain quality.
4. Offer user-opt-in personal lexicon and encrypted parameter-efficient adapter. Evaluate on **later sessions not used for enrolment** to measure benefit under changing conditions.
5. Use uncertainty-aware hypotheses and clear correction UI. Never silently execute high-impact commands or assume transcription equals consent.
6. Publish model cards, dataset cards (metadata only where rights require), license lineage, disaggregated accuracy, limitations, security review and withdrawal/retraining procedure before field release.

**Why speaker disjoint?** Mixed recordings from the same speaker in training and test can substantially overstate new-speaker generalisation. Personalisation needs a distinct longitudinal evaluation design.

## Privacy and governance

Speech recordings, diagnostic metadata and certain embeddings can be identifying/sensitive information even when IDs are replaced with random pseudonyms. Store raw audio, real names, clinical records and consent artifacts outside the Git repository in purpose-restricted, access-logged encrypted storage. Enforce revocation and deletion workflow including derived training sets; evaluate machine-unlearning/model release implications rather than promising that already distributed weights can always be erased.

- Australia: obtain privacy review for Privacy Act 1988 and applicable Australian Privacy Principles, including sensitive information, collection notices, purpose limitations, APP 8 cross-border disclosure, access/correction, security and breach handling. Also assess relevant state rules; for a NSW health service consider the Health Records and Information Privacy Act 2002.
- USA: HIPAA applies only when regulated entities/business associates and qualifying PHI are involved. Safe Harbor includes voice prints as identifiers; pseudonymous audio alone is not automatically de-identified.
- Offer accessible consent, optional diagnostic disclosure, non-speech control, optional local-only processing, explicit model-training opt-in separated from everyday use, withdrawal without losing baseline access, and explainable changes.
- Keep SpeechPrint outside clinical diagnosis, competency or identity decisions. No automatic disability classification, voice-based identity matching or cognitive-capacity inference.

Privacy/legal review and Aboriginal and Torres Strait Islander data governance consultation should happen prior to any cohort recruitment where applicable. WCAG 2.2 AA is the interface design target, not a current compliance claim.

## Validation / research governance

Before approval, seek co-design and paid participation by people with CP with a range of speech and AAC use, independent speech-language pathology review, secure data stewardship and ethics/HREC advice as needed. Evaluate per-speaker and worst-group performance with uncertainty intervals, not pooled WER alone. Track false trigger rates for safety-relevant commands and preserve user agency to confirm/correct/decline.

**Repository integration:** this is deliberately a separate top-level `speechprint/` directory; it does not modify the existing Project Euphonia `audiotool/` reference implementation.
