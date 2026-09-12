from importlib import import_module


def _model_policy_module():
    return import_module("aditunis_ml.model_policy")


def test_under_8gb_defaults_to_whisper_small():
    module = _model_policy_module()
    plan = module.recommend_whisper_plan(6)
    assert plan.default_model == "openai/whisper-small"
    assert "openai/whisper-base" in plan.alternatives


def test_10gb_keeps_small_as_default_but_exposes_medium_lora_candidate():
    module = _model_policy_module()
    plan = module.recommend_whisper_plan(10)
    assert plan.default_model == "openai/whisper-small"
    assert "openai/whisper-medium" in plan.alternatives
    assert plan.adapter == "lora"


def test_16gb_defaults_to_medium_and_exposes_large_v3_as_candidate():
    module = _model_policy_module()
    plan = module.recommend_whisper_plan(16)
    assert plan.default_model == "openai/whisper-medium"
    assert "openai/whisper-large-v3" in plan.alternatives


def test_model_policy_does_not_use_wer_or_speaking_rate_as_vram_proxies():
    module = _model_policy_module()
    plan = module.recommend_whisper_plan(12)
    assert not hasattr(plan, "wer")
    assert not hasattr(plan, "words_per_minute")
