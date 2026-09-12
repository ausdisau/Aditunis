from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import re
from typing import Literal, Sequence


SpeechMode = Literal["prepared", "spontaneous"]

_PSEUDONYMOUS_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$")


@dataclass(frozen=True)
class SpeechSampleManifest:
    """Privacy-minimised metadata for an Aditunis speech training sample.

    `transcript_verbatim` preserves how the person actually spoke, including
    hesitations and disfluencies. `transcript_normalized` is a separate view for
    ASR scoring/training transforms and must not overwrite the verbatim record.
    """

    sample_id: str
    participant_id: str
    speech_mode: SpeechMode
    prompt: str
    transcript_verbatim: str
    transcript_normalized: str
    language_tags: tuple[str, ...]
    consent_id: str
    code_switching: bool = False

    def __post_init__(self) -> None:
        if self.speech_mode not in ("prepared", "spontaneous"):
            raise ValueError("speech_mode must be prepared or spontaneous")
        if not _PSEUDONYMOUS_ID.fullmatch(self.participant_id):
            raise ValueError(
                "participant_id must be a pseudonymous identifier, not personal contact information"
            )
        if not self.language_tags:
            raise ValueError("at least one language tag is required")
        unique_languages = {tag.strip() for tag in self.language_tags if tag.strip()}
        if not unique_languages:
            raise ValueError("at least one non-empty language tag is required")
        if self.code_switching and len(unique_languages) < 2:
            raise ValueError(
                "code-switching samples require at least two declared language tags"
            )
        if not self.consent_id.strip():
            raise ValueError("consent_id is required")


def validate_speaker_disjoint_splits(
    *,
    train: Sequence[SpeechSampleManifest],
    validation: Sequence[SpeechSampleManifest],
    test: Sequence[SpeechSampleManifest],
) -> None:
    """Reject participant leakage across train/validation/test splits."""

    split_participants = {
        "train": {sample.participant_id for sample in train},
        "validation": {sample.participant_id for sample in validation},
        "test": {sample.participant_id for sample in test},
    }

    pairs = (("train", "validation"), ("train", "test"), ("validation", "test"))
    for left, right in pairs:
        overlap = split_participants[left] & split_participants[right]
        if overlap:
            raise ValueError(
                f"participant leakage between {left} and {right}: {sorted(overlap)}"
            )


def summarize_speech_modes(
    samples: Sequence[SpeechSampleManifest],
) -> dict[SpeechMode, int]:
    counts = Counter(sample.speech_mode for sample in samples)
    return {
        "prepared": counts.get("prepared", 0),
        "spontaneous": counts.get("spontaneous", 0),
    }
