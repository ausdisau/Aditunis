from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal
from urllib.parse import urlencode


VoiceLiveMode = Literal["transcription", "conversation"]

AZURE_SPEECH_VOICE_LIVE_CATALOG_URI = (
    "azureml://registries/azureml-cogsvc/models/"
    "Azure-Speech-Voice-Live/versions/1"
)
VOICE_LIVE_API_VERSION = "2026-04-10"


@dataclass(frozen=True)
class AzureVoiceLiveConfig:
    """Server-side Voice Live connection settings for Aditunis.

    `catalog_uri` records the Azure model-catalog asset supplied by the project.
    It is metadata/provenance only: the WebSocket endpoint uses the Voice Live
    runtime model name (for example `azure-realtime`) as its `model` parameter.
    """

    catalog_uri: str
    endpoint: str
    model: str
    mode: VoiceLiveMode
    session_update: dict[str, Any]


def _validate_resource_name(resource_name: str) -> str:
    value = resource_name.strip()
    if not value:
        raise ValueError("resource_name must not be empty")
    if any(ch in value for ch in "/:?&#"):
        raise ValueError("resource_name must be the Foundry resource name, not a URL")
    return value


def build_voice_live_config(
    *,
    resource_name: str,
    model: str = "azure-realtime",
    mode: VoiceLiveMode = "transcription",
    language: str = "en-AU",
    speech_pause_tolerance_ms: int = 1800,
) -> AzureVoiceLiveConfig:
    """Build an accessibility-first Voice Live session configuration.

    The default mode is transcription-only so Aditunis remains responsible for
    authorship, confidence handling, multimodal fusion, and response generation.
    Conversation mode must be selected explicitly.
    """

    resource = _validate_resource_name(resource_name)
    runtime_model = model.strip()
    if not runtime_model:
        raise ValueError("model must not be empty")
    if mode not in {"transcription", "conversation"}:
        raise ValueError("mode must be 'transcription' or 'conversation'")
    if speech_pause_tolerance_ms < 500:
        raise ValueError("speech_pause_tolerance_ms must be at least 500 ms")

    query = urlencode(
        {
            "api-version": VOICE_LIVE_API_VERSION,
            "model": runtime_model,
        }
    )
    endpoint = (
        f"wss://{resource}.services.ai.azure.com/voice-live/realtime?{query}"
    )

    create_response = mode == "conversation"
    session: dict[str, Any] = {
        "modalities": ["text", "audio"] if create_response else ["text"],
        "input_audio_transcription": {
            "model": "azure-speech",
            "language": language,
        },
        "turn_detection": {
            "type": "azure_semantic_vad",
            "silence_duration_ms": speech_pause_tolerance_ms,
            "remove_filler_words": False,
            "create_response": create_response,
            # Aditunis owns interruption and explicit STOP_OUTPUT semantics.
            "interrupt_response": False,
            "auto_truncate": False,
        },
    }

    return AzureVoiceLiveConfig(
        catalog_uri=AZURE_SPEECH_VOICE_LIVE_CATALOG_URI,
        endpoint=endpoint,
        model=runtime_model,
        mode=mode,
        session_update={
            "type": "session.update",
            "session": session,
        },
    )


def build_server_auth_headers(
    *,
    entra_token: str | None,
    api_key: str | None,
) -> dict[str, str]:
    """Return server-side Voice Live authentication headers.

    Microsoft Entra bearer authentication is preferred. API keys are accepted
    only as pre-handshake server headers in this adapter; Aditunis never puts a
    credential into a browser URL or client-visible query string.
    """

    token = entra_token.strip() if entra_token else ""
    key = api_key.strip() if api_key else ""
    if bool(token) == bool(key):
        raise ValueError("exactly one of entra_token or api_key must be provided")

    if token:
        return {"Authorization": f"Bearer {token}"}
    return {"api-key": key}


__all__ = [
    "AZURE_SPEECH_VOICE_LIVE_CATALOG_URI",
    "AzureVoiceLiveConfig",
    "VOICE_LIVE_API_VERSION",
    "build_server_auth_headers",
    "build_voice_live_config",
]
