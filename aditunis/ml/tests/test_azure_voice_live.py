from __future__ import annotations

import pytest


def _module():
    from importlib import import_module

    return import_module("aditunis_ml.azure_voice_live")


def test_catalog_asset_matches_foundry_registry_reference():
    module = _module()

    assert module.AZURE_SPEECH_VOICE_LIVE_CATALOG_URI == (
        "azureml://registries/azureml-cogsvc/models/"
        "Azure-Speech-Voice-Live/versions/1"
    )


def test_runtime_endpoint_uses_voice_live_model_name_not_catalog_uri():
    module = _module()

    config = module.build_voice_live_config(
        resource_name="aditunis-speech",
        model="azure-realtime",
    )

    assert config.catalog_uri == module.AZURE_SPEECH_VOICE_LIVE_CATALOG_URI
    assert config.endpoint == (
        "wss://aditunis-speech.services.ai.azure.com/voice-live/realtime"
        "?api-version=2026-04-10&model=azure-realtime"
    )
    assert "azureml://" not in config.endpoint


def test_accessibility_defaults_allow_extended_speech_pauses():
    module = _module()

    config = module.build_voice_live_config(
        resource_name="aditunis-speech",
        speech_pause_tolerance_ms=1800,
    )

    turn_detection = config.session_update["session"]["turn_detection"]
    assert turn_detection["type"] == "azure_semantic_vad"
    assert turn_detection["silence_duration_ms"] == 1800
    assert turn_detection["remove_filler_words"] is False
    assert turn_detection["interrupt_response"] is False


def test_transcription_mode_keeps_response_generation_under_aditunis_control():
    module = _module()

    config = module.build_voice_live_config(
        resource_name="aditunis-speech",
        mode="transcription",
        language="en-AU",
    )

    session = config.session_update["session"]
    assert session["input_audio_transcription"] == {
        "model": "azure-speech",
        "language": "en-AU",
    }
    assert session["turn_detection"]["create_response"] is False
    assert session["modalities"] == ["text"]


def test_conversation_mode_requires_explicit_opt_in():
    module = _module()

    transcription = module.build_voice_live_config(
        resource_name="aditunis-speech",
    )
    conversation = module.build_voice_live_config(
        resource_name="aditunis-speech",
        mode="conversation",
    )

    assert transcription.mode == "transcription"
    assert transcription.session_update["session"]["turn_detection"]["create_response"] is False
    assert conversation.session_update["session"]["turn_detection"]["create_response"] is True


def test_server_auth_prefers_entra_bearer_header_and_never_puts_secret_in_url():
    module = _module()

    auth = module.build_server_auth_headers(
        entra_token="secret-entra-token",
        api_key=None,
    )

    assert auth == {"Authorization": "Bearer secret-entra-token"}

    config = module.build_voice_live_config(resource_name="aditunis-speech")
    assert "secret-entra-token" not in config.endpoint


def test_api_key_is_supported_only_as_server_header_in_adapter():
    module = _module()

    auth = module.build_server_auth_headers(
        entra_token=None,
        api_key="secret-api-key",
    )

    assert auth == {"api-key": "secret-api-key"}


def test_auth_requires_exactly_one_server_credential():
    module = _module()

    with pytest.raises(ValueError, match="exactly one"):
        module.build_server_auth_headers(entra_token=None, api_key=None)

    with pytest.raises(ValueError, match="exactly one"):
        module.build_server_auth_headers(
            entra_token="token",
            api_key="key",
        )


def test_profile_metadata_does_not_include_disability_or_phenotype_data():
    module = _module()

    config = module.build_voice_live_config(
        resource_name="aditunis-speech",
        speech_pause_tolerance_ms=2200,
        language="en-AU",
    )

    flattened = repr(config.session_update).lower()
    assert "diagnosis" not in flattened
    assert "cerebral palsy" not in flattened
    assert "phenotype" not in flattened
    assert "gesture" not in flattened
    assert "gaze" not in flattened
