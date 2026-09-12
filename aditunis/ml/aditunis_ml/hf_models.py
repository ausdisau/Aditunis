from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


DeploymentMode = Literal["research", "production"]
DisfluencyRepresentation = Literal["verbatim", "smoothed"]


class ModelPolicyError(RuntimeError):
    """Raised when a model may not be used in the requested deployment mode."""


class ModelAccessError(RuntimeError):
    """Raised when a gated model is selected without explicit Hub access."""


@dataclass(frozen=True)
class SpecializedSpeechModel:
    key: str
    repo_id: str
    role: str
    task: str
    library: str
    license: str
    loader: str
    dependencies: tuple[str, ...]
    base_model: str | None = None
    gated: bool = False
    production_allowed: bool = True
    condition_tags: tuple[str, ...] = ()
    notes: tuple[str, ...] = ()


@dataclass(frozen=True)
class ModelLoadPlan:
    key: str
    repo_id: str
    task: str
    loader: str
    dependencies: tuple[str, ...]
    base_model: str | None
    gated: bool
    license: str


@dataclass(frozen=True)
class SpecializedModelStack:
    primary_asr: str
    personal_asr: str
    phenotype_models: tuple[str, ...]
    disfluency_models: tuple[str, ...]
    optional_condition_models: tuple[str, ...]
    representation_model: str | None = None


_MODEL_REGISTRY: dict[str, SpecializedSpeechModel] = {
    "dysasr-parakeet-tdt": SpecializedSpeechModel(
        key="dysasr-parakeet-tdt",
        repo_id="dys-asr/parakeet-tdt-0.6b-all-aug",
        role="population_asr",
        task="automatic-speech-recognition",
        library="transformers",
        license="other",
        loader="transformers_asr_pipeline",
        dependencies=("torch", "transformers", "huggingface_hub"),
        base_model="nvidia/parakeet-tdt-0.6b-v3",
        gated=True,
        production_allowed=False,
        notes=(
            "Gated model; access must be accepted on Hugging Face before use.",
            "Licence is reported as 'other', so production use is blocked until reviewed.",
        ),
    ),
    "torgo-whisper-lora": SpecializedSpeechModel(
        key="torgo-whisper-lora",
        repo_id="dbarbera/whisper-small-torgo-dysarthria-lora",
        role="personal_asr",
        task="automatic-speech-recognition",
        library="peft",
        license="mit",
        loader="peft_whisper",
        dependencies=("torch", "transformers", "peft"),
        base_model="openai/whisper-small",
        notes=(
            "Dysarthria-focused Whisper LoRA trained on TORGO.",
            "Use as an adaptation baseline; do not assume TORGO generalises to every speaker.",
        ),
    ),
    "stuttering-wavlm-lora": SpecializedSpeechModel(
        key="stuttering-wavlm-lora",
        repo_id="pmootr/stuttering-detection-wavlm-lora",
        role="disfluency_detector",
        task="audio-classification",
        library="peft",
        license="apache-2.0",
        loader="peft_audio_classifier",
        dependencies=("torch", "transformers", "peft"),
        base_model="microsoft/wavlm-base-plus",
        notes=(
            "Sidecar classifier for disfluency evidence; not a transcript authority.",
        ),
    ),
    "dysarthria-severity-probe": SpecializedSpeechModel(
        key="dysarthria-severity-probe",
        repo_id="jaesungbae/da-dsqa",
        role="phenotype_probe",
        task="audio-classification",
        library="custom",
        license="mit",
        loader="custom_whisper_severity_probe",
        dependencies=("torch", "transformers", "safetensors"),
        notes=(
            "Use only as a recognition-difficulty/phenotype signal; never as a diagnosis.",
        ),
    ),
    "huntingtons-parakeet": SpecializedSpeechModel(
        key="huntingtons-parakeet",
        repo_id="charleslwang/parakeet-tdt-0.6b-HD",
        role="condition_asr",
        task="automatic-speech-recognition",
        library="nemo",
        license="apache-2.0",
        loader="nemo_asr",
        dependencies=("torch", "nemo_toolkit[asr]", "huggingface_hub"),
        base_model="nvidia/parakeet-tdt-0.6b-v2",
        condition_tags=("huntingtons-disease",),
        notes=(
            "Condition-specific optional adapter; never infer Huntington disease from speech.",
        ),
    ),
    "disfluency-smoothed-whisper": SpecializedSpeechModel(
        key="disfluency-smoothed-whisper",
        repo_id="nazarkozak/whisper-small-disfluent-smoothed-lora",
        role="representation_asr",
        task="automatic-speech-recognition",
        library="peft",
        license="cc-by-nc-sa-4.0",
        loader="peft_whisper",
        dependencies=("torch", "transformers", "peft"),
        base_model="openai/whisper-small",
        production_allowed=False,
        notes=(
            "Research-only in Aditunis because the model licence is non-commercial.",
            "Select only when the user explicitly requests intended/smoothed representation.",
        ),
    ),
    "disfluency-verbatim-whisper": SpecializedSpeechModel(
        key="disfluency-verbatim-whisper",
        repo_id="nazarkozak/whisper-small-disfluent-verbatim-lora",
        role="representation_asr",
        task="automatic-speech-recognition",
        library="peft",
        license="cc-by-nc-sa-4.0",
        loader="peft_whisper",
        dependencies=("torch", "transformers", "peft"),
        base_model="openai/whisper-small",
        production_allowed=False,
        notes=(
            "Research-only in Aditunis because the model licence is non-commercial.",
            "Select only when the user explicitly requests verbatim representation.",
        ),
    ),
}


def _validate_deployment(deployment: str) -> DeploymentMode:
    if deployment not in {"research", "production"}:
        raise ValueError("deployment must be 'research' or 'production'")
    return deployment  # type: ignore[return-value]


def get_model_spec(key: str) -> SpecializedSpeechModel:
    try:
        return _MODEL_REGISTRY[key]
    except KeyError as exc:
        raise KeyError(f"Unknown specialised speech model: {key}") from exc


def list_eligible_models(*, deployment: str) -> tuple[SpecializedSpeechModel, ...]:
    mode = _validate_deployment(deployment)
    models = tuple(_MODEL_REGISTRY.values())
    if mode == "production":
        models = tuple(model for model in models if model.production_allowed)
    return models


def build_load_plan(
    key: str,
    *,
    deployment: str,
    hf_token_present: bool,
) -> ModelLoadPlan:
    mode = _validate_deployment(deployment)
    spec = get_model_spec(key)

    if mode == "production" and not spec.production_allowed:
        raise ModelPolicyError(
            f"{spec.repo_id} is not approved for production use in Aditunis "
            f"under its current licence/access status"
        )

    if spec.gated and not hf_token_present:
        raise ModelAccessError(
            f"{spec.repo_id} is gated on Hugging Face; explicit access and an HF token are required"
        )

    return ModelLoadPlan(
        key=spec.key,
        repo_id=spec.repo_id,
        task=spec.task,
        loader=spec.loader,
        dependencies=spec.dependencies,
        base_model=spec.base_model,
        gated=spec.gated,
        license=spec.license,
    )


def select_specialized_stack(
    *,
    deployment: str,
    hf_token_present: bool,
    condition_tags: tuple[str, ...] = (),
    disfluency_representation: str | None = None,
) -> SpecializedModelStack:
    mode = _validate_deployment(deployment)

    if disfluency_representation not in {None, "verbatim", "smoothed"}:
        raise ValueError(
            "disfluency_representation must be 'verbatim', 'smoothed', or None"
        )

    primary_asr = (
        "dysasr-parakeet-tdt"
        if mode == "research" and hf_token_present
        else "torgo-whisper-lora"
    )

    optional_condition_models: list[str] = []
    requested_conditions = {tag.strip().lower() for tag in condition_tags}
    for spec in _MODEL_REGISTRY.values():
        if not spec.condition_tags:
            continue
        if requested_conditions.intersection(spec.condition_tags):
            optional_condition_models.append(spec.key)

    representation_model: str | None = None
    if disfluency_representation is not None:
        representation_model = (
            "disfluency-verbatim-whisper"
            if disfluency_representation == "verbatim"
            else "disfluency-smoothed-whisper"
        )
        if mode == "production":
            raise ModelPolicyError(
                "The current Hugging Face disfluency representation adapters are not "
                "approved for Aditunis production use"
            )

    return SpecializedModelStack(
        primary_asr=primary_asr,
        personal_asr="torgo-whisper-lora",
        phenotype_models=("dysarthria-severity-probe",),
        disfluency_models=("stuttering-wavlm-lora",),
        optional_condition_models=tuple(optional_condition_models),
        representation_model=representation_model,
    )
