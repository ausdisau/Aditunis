from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any

from .hf_models import (
    ModelAccessError,
    ModelLoadPlan,
    ModelPolicyError,
    build_load_plan,
)


class RuntimeBackendUnavailable(RuntimeError):
    """Raised when a registered model needs a runtime adapter not yet enabled."""


RuntimeLoader = Callable[..., Any]


def _transformers_pipeline_loader(
    plan: ModelLoadPlan,
    *,
    hf_token: str | None,
    device: str | int | None,
) -> Any:
    """Load a Hub model lazily through the Transformers pipeline API.

    The import happens only when the model is actually requested so the core
    Aditunis package can run without heavyweight ML dependencies installed.
    Remote repository code is intentionally disabled.
    """

    try:
        from transformers import pipeline
    except ImportError as exc:  # pragma: no cover - depends on deployment image
        raise RuntimeBackendUnavailable(
            "transformers is required to load Hugging Face speech models"
        ) from exc

    kwargs: dict[str, Any] = {
        "task": plan.task,
        "model": plan.repo_id,
        "trust_remote_code": False,
    }
    if hf_token:
        kwargs["token"] = hf_token
    if device is not None:
        kwargs["device"] = device

    return pipeline(**kwargs)


def _peft_pipeline_loader(
    plan: ModelLoadPlan,
    *,
    hf_token: str | None,
    device: str | int | None,
) -> Any:
    """Load a PEFT adapter repository without executing remote model code.

    Current Transformers versions can resolve PEFT adapter repositories through
    the pipeline API when `peft` is installed. Keeping the adapter repository as
    the model identifier also preserves the Hub model card/provenance boundary.
    """

    try:
        import peft  # noqa: F401 - availability check before pipeline resolution
    except ImportError as exc:  # pragma: no cover - depends on deployment image
        raise RuntimeBackendUnavailable(
            "peft is required to load Aditunis LoRA speech adapters"
        ) from exc

    return _transformers_pipeline_loader(
        plan,
        hf_token=hf_token,
        device=device,
    )


def _default_loaders() -> dict[str, RuntimeLoader]:
    return {
        "transformers_asr_pipeline": _transformers_pipeline_loader,
        "peft_whisper": _peft_pipeline_loader,
        "peft_audio_classifier": _peft_pipeline_loader,
    }


class HuggingFaceRuntime:
    """Policy-enforced lazy loader for specialised Aditunis speech models.

    Registry policy is evaluated before any model download or third-party ML
    import occurs. This is important for gated repositories and for model cards
    whose licences do not permit production use.
    """

    def __init__(self, loaders: Mapping[str, RuntimeLoader] | None = None) -> None:
        self._loaders = dict(loaders) if loaders is not None else _default_loaders()

    @property
    def supported_loaders(self) -> set[str]:
        return set(self._loaders)

    def load(
        self,
        key: str,
        *,
        deployment: str,
        hf_token: str | None,
        device: str | int | None = None,
    ) -> Any:
        plan = build_load_plan(
            key,
            deployment=deployment,
            hf_token_present=bool(hf_token),
        )

        loader = self._loaders.get(plan.loader)
        if loader is None:
            raise RuntimeBackendUnavailable(
                f"No safe local runtime adapter is enabled for loader '{plan.loader}'. "
                "Add an explicit reviewed adapter rather than enabling remote repository code."
            )

        return loader(
            plan,
            hf_token=hf_token,
            device=device,
        )


__all__ = [
    "HuggingFaceRuntime",
    "ModelAccessError",
    "ModelPolicyError",
    "RuntimeBackendUnavailable",
]
