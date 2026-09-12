from importlib import import_module

import pytest


def _module():
    return import_module("aditunis_ml.data_policy")


def test_spontaneous_sample_preserves_verbatim_and_normalized_transcripts():
    module = _module()
    sample = module.SpeechSampleManifest(
        sample_id="sample-1",
        participant_id="participant-a",
        speech_mode="spontaneous",
        prompt="What did you do this weekend?",
        transcript_verbatim="Um, I went... to the beach, yeah.",
        transcript_normalized="i went to the beach yeah",
        language_tags=("en-AU",),
        consent_id="consent-v1",
    )

    assert sample.transcript_verbatim.startswith("Um,")
    assert sample.transcript_normalized == "i went to the beach yeah"
    assert sample.speech_mode == "spontaneous"


def test_code_switching_requires_multiple_declared_language_tags():
    module = _module()

    with pytest.raises(ValueError, match="language"):
        module.SpeechSampleManifest(
            sample_id="sample-2",
            participant_id="participant-a",
            speech_mode="spontaneous",
            prompt="Tell me about your family.",
            transcript_verbatim="Hello there",
            transcript_normalized="hello there",
            language_tags=("en-AU",),
            code_switching=True,
            consent_id="consent-v1",
        )


def test_personal_identifiers_are_not_allowed_in_training_manifest():
    module = _module()

    with pytest.raises(ValueError, match="pseudonymous"):
        module.SpeechSampleManifest(
            sample_id="sample-3",
            participant_id="jonathan@example.com",
            speech_mode="prepared",
            prompt="Please read this sentence.",
            transcript_verbatim="Please read this sentence.",
            transcript_normalized="please read this sentence",
            language_tags=("en-AU",),
            consent_id="consent-v1",
        )


def test_speaker_disjoint_split_rejects_participant_leakage():
    module = _module()
    samples = [
        module.SpeechSampleManifest(
            sample_id="a-train",
            participant_id="participant-a",
            speech_mode="prepared",
            prompt="Read this.",
            transcript_verbatim="Read this.",
            transcript_normalized="read this",
            language_tags=("en-AU",),
            consent_id="consent-v1",
        ),
        module.SpeechSampleManifest(
            sample_id="a-test",
            participant_id="participant-a",
            speech_mode="spontaneous",
            prompt="Tell me something.",
            transcript_verbatim="Something.",
            transcript_normalized="something",
            language_tags=("en-AU",),
            consent_id="consent-v1",
        ),
    ]

    with pytest.raises(ValueError, match="participant"):
        module.validate_speaker_disjoint_splits(
            train=[samples[0]],
            validation=[],
            test=[samples[1]],
        )


def test_stratification_summary_keeps_prepared_and_spontaneous_results_visible():
    module = _module()
    samples = [
        module.SpeechSampleManifest(
            sample_id="prepared-1",
            participant_id="participant-a",
            speech_mode="prepared",
            prompt="Read this.",
            transcript_verbatim="Read this.",
            transcript_normalized="read this",
            language_tags=("en-AU",),
            consent_id="consent-v1",
        ),
        module.SpeechSampleManifest(
            sample_id="spontaneous-1",
            participant_id="participant-b",
            speech_mode="spontaneous",
            prompt="Tell me something.",
            transcript_verbatim="Well, something.",
            transcript_normalized="well something",
            language_tags=("en-AU",),
            consent_id="consent-v1",
        ),
    ]

    summary = module.summarize_speech_modes(samples)
    assert summary == {"prepared": 1, "spontaneous": 1}
