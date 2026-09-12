from __future__ import annotations

import pytest


def _module():
    from importlib import import_module

    return import_module("aditunis_ml.hf_runtime")


def test_runtime_dispatches_policy_checked_plan_to_loader():
    module = _module()
    calls = []

    def loader(plan, *, hf_token, device):
        calls.append((plan, hf_token, device))
        return "loaded"

    runtime = module.HuggingFaceRuntime(loaders={"peft_whisper": loader})
    result = runtime.load(
        "torgo-whisper-lora",
        deployment="production",
        hf_token=None,
        device="cpu",
    )

    assert result == "loaded"
    plan, token, device = calls[0]
    assert plan.repo_id == "dbarbera/whisper-small-torgo-dysarthria-lora"
    assert plan.base_model == "openai/whisper-small"
    assert token is None
    assert device == "cpu"


def test_runtime_checks_gated_access_before_loader_is_called():
    module = _module()
    called = False

    def loader(plan, *, hf_token, device):
        nonlocal called
        called = True
        return object()

    runtime = module.HuggingFaceRuntime(
        loaders={"transformers_asr_pipeline": loader}
    )

    with pytest.raises(module.ModelAccessError, match="gated"):
        runtime.load(
            "dysasr-parakeet-tdt",
            deployment="research",
            hf_token=None,
        )

    assert called is False


def test_default_runtime_exposes_safe_lazy_backends():
    module = _module()

    runtime = module.HuggingFaceRuntime()

    assert runtime.supported_loaders == {
        "transformers_asr_pipeline",
        "peft_whisper",
        "peft_audio_classifier",
    }


def test_custom_severity_probe_requires_local_adapter_not_remote_code():
    module = _module()

    runtime = module.HuggingFaceRuntime()

    with pytest.raises(module.RuntimeBackendUnavailable, match="custom_whisper_severity_probe"):
        runtime.load(
            "dysarthria-severity-probe",
            deployment="production",
            hf_token=None,
        )


def test_nemo_model_requires_explicit_nemo_adapter():
    module = _module()

    runtime = module.HuggingFaceRuntime()

    with pytest.raises(module.RuntimeBackendUnavailable, match="nemo_asr"):
        runtime.load(
            "huntingtons-parakeet",
            deployment="production",
            hf_token=None,
        )
