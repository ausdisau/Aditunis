from __future__ import annotations

import pytest


def _module():
    from importlib import import_module

    return import_module("aditunis_ml.hf_models")


def test_registry_contains_accessibility_specialised_models():
    module = _module()

    expected = {
        "dysasr-parakeet-tdt": "dys-asr/parakeet-tdt-0.6b-all-aug",
        "torgo-whisper-lora": "dbarbera/whisper-small-torgo-dysarthria-lora",
        "stuttering-wavlm-lora": "pmootr/stuttering-detection-wavlm-lora",
        "dysarthria-severity-probe": "jaesungbae/da-dsqa",
        "huntingtons-parakeet": "charleslwang/parakeet-tdt-0.6b-HD",
        "disfluency-smoothed-whisper": "nazarkozak/whisper-small-disfluent-smoothed-lora",
        "disfluency-verbatim-whisper": "nazarkozak/whisper-small-disfluent-verbatim-lora",
    }

    assert {key: module.get_model_spec(key).repo_id for key in expected} == expected


def test_gated_population_model_requires_explicit_hugging_face_access():
    module = _module()

    with pytest.raises(module.ModelAccessError, match="gated"):
        module.build_load_plan(
            "dysasr-parakeet-tdt",
            deployment="research",
            hf_token_present=False,
        )

    plan = module.build_load_plan(
        "dysasr-parakeet-tdt",
        deployment="research",
        hf_token_present=True,
    )
    assert plan.repo_id == "dys-asr/parakeet-tdt-0.6b-all-aug"
    assert plan.loader == "transformers_asr_pipeline"


def test_production_catalog_excludes_unclear_and_noncommercial_licences():
    module = _module()

    keys = {spec.key for spec in module.list_eligible_models(deployment="production")}

    assert "dysasr-parakeet-tdt" not in keys
    assert "disfluency-smoothed-whisper" not in keys
    assert "disfluency-verbatim-whisper" not in keys
    assert "torgo-whisper-lora" in keys
    assert "stuttering-wavlm-lora" in keys
    assert "dysarthria-severity-probe" in keys
    assert "huntingtons-parakeet" in keys


def test_noncommercial_disfluency_adapter_is_blocked_in_production():
    module = _module()

    with pytest.raises(module.ModelPolicyError, match="production"):
        module.build_load_plan(
            "disfluency-smoothed-whisper",
            deployment="production",
            hf_token_present=False,
        )


def test_peft_whisper_plan_keeps_base_model_and_adapter_separate():
    module = _module()

    plan = module.build_load_plan(
        "torgo-whisper-lora",
        deployment="production",
        hf_token_present=False,
    )

    assert plan.loader == "peft_whisper"
    assert plan.base_model == "openai/whisper-small"
    assert plan.dependencies == ("torch", "transformers", "peft")


def test_huntingtons_model_is_only_selected_when_condition_is_explicit():
    module = _module()

    generic = module.select_specialized_stack(
        deployment="production",
        hf_token_present=False,
        condition_tags=(),
    )
    hd = module.select_specialized_stack(
        deployment="production",
        hf_token_present=False,
        condition_tags=("huntingtons-disease",),
    )

    assert "huntingtons-parakeet" not in generic.optional_condition_models
    assert "huntingtons-parakeet" in hd.optional_condition_models


def test_default_stack_keeps_recognition_and_phenotype_sidecars_separate():
    module = _module()

    stack = module.select_specialized_stack(
        deployment="production",
        hf_token_present=False,
    )

    assert stack.primary_asr == "torgo-whisper-lora"
    assert stack.phenotype_models == ("dysarthria-severity-probe",)
    assert stack.disfluency_models == ("stuttering-wavlm-lora",)


def test_research_stack_can_use_gated_dysasr_when_access_is_available():
    module = _module()

    stack = module.select_specialized_stack(
        deployment="research",
        hf_token_present=True,
    )

    assert stack.primary_asr == "dysasr-parakeet-tdt"
    assert stack.personal_asr == "torgo-whisper-lora"


def test_disfluency_representation_is_explicit_and_never_silent():
    module = _module()

    verbatim = module.select_specialized_stack(
        deployment="research",
        hf_token_present=False,
        disfluency_representation="verbatim",
    )
    smoothed = module.select_specialized_stack(
        deployment="research",
        hf_token_present=False,
        disfluency_representation="smoothed",
    )

    assert verbatim.representation_model == "disfluency-verbatim-whisper"
    assert smoothed.representation_model == "disfluency-smoothed-whisper"

    with pytest.raises(ValueError, match="disfluency_representation"):
        module.select_specialized_stack(
            deployment="research",
            hf_token_present=False,
            disfluency_representation="automatic",
        )
