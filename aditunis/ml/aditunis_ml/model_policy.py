from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class WhisperTrainingPlan:
    """A conservative starting point for local Whisper fine-tuning.

    VRAM is a capacity signal, not a guarantee: actual memory use changes with
    batch size, precision, sequence length, gradient checkpointing and adapter
    strategy. Speaking rate and baseline WER are benchmark characteristics,
    not substitutes for a memory budget.
    """

    default_model: str
    alternatives: tuple[str, ...]
    adapter: str
    notes: tuple[str, ...]


MODEL_PARAMETERS_MILLIONS = {
    "openai/whisper-base": 74,
    "openai/whisper-small": 244,
    "openai/whisper-medium": 769,
    "openai/whisper-large-v3": 1550,
}


def recommend_whisper_plan(vram_gb: float) -> WhisperTrainingPlan:
    if vram_gb <= 0:
        raise ValueError("vram_gb must be greater than zero")

    common_notes = (
        "Use mixed precision and gradient checkpointing when supported.",
        "Treat this as a starting configuration; measure peak VRAM on the target GPU.",
    )

    if vram_gb < 8:
        return WhisperTrainingPlan(
            default_model="openai/whisper-small",
            alternatives=("openai/whisper-base",),
            adapter="lora",
            notes=(
                "Prefer a small per-device batch size with gradient accumulation.",
                *common_notes,
            ),
        )

    if vram_gb < 12:
        return WhisperTrainingPlan(
            default_model="openai/whisper-small",
            alternatives=("openai/whisper-medium",),
            adapter="lora",
            notes=(
                "Whisper-medium is an opt-in experiment in this tier, not a fit guarantee.",
                *common_notes,
            ),
        )

    if vram_gb < 16:
        return WhisperTrainingPlan(
            default_model="openai/whisper-medium",
            alternatives=("openai/whisper-small",),
            adapter="lora",
            notes=common_notes,
        )

    return WhisperTrainingPlan(
        default_model="openai/whisper-medium",
        alternatives=("openai/whisper-large-v3",),
        adapter="lora",
        notes=(
            "Treat Whisper-large-v3 as an alternative requiring measured memory headroom.",
            *common_notes,
        ),
    )
