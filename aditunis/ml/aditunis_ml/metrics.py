from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Any

import jiwer
import numpy as np
from transformers.models.whisper.english_normalizer import BasicTextNormalizer


TextNormalizer = Callable[[str], str]


def _wer_percent(predictions: Sequence[str], references: Sequence[str]) -> float:
    pairs = [
        (prediction, reference)
        for prediction, reference in zip(predictions, references, strict=True)
        if reference.strip()
    ]
    if not pairs:
        return 0.0

    filtered_predictions = [prediction for prediction, _ in pairs]
    filtered_references = [reference for _, reference in pairs]
    return 100.0 * float(jiwer.wer(filtered_references, filtered_predictions))


def compute_wer_metrics(
    predictions: Sequence[str],
    references: Sequence[str],
    normalizer: TextNormalizer | None = None,
) -> dict[str, float]:
    """Return raw and Whisper-normalized WER without erasing either view.

    Raw WER is useful for inspecting orthographic and verbatim transcription
    differences. Normalized WER is the training-selection metric so casing and
    punctuation do not create artificial penalties. References that normalize
    to an empty string are excluded from the normalized denominator.
    """

    if len(predictions) != len(references):
        raise ValueError("predictions and references must have the same length")

    normalize = normalizer or BasicTextNormalizer()
    raw_wer = _wer_percent(predictions, references)

    normalized_pairs = []
    for prediction, reference in zip(predictions, references, strict=True):
        normalized_prediction = normalize(prediction).strip()
        normalized_reference = normalize(reference).strip()
        if normalized_reference:
            normalized_pairs.append((normalized_prediction, normalized_reference))

    if normalized_pairs:
        normalized_predictions = [prediction for prediction, _ in normalized_pairs]
        normalized_references = [reference for _, reference in normalized_pairs]
        normalized_wer = 100.0 * float(
            jiwer.wer(normalized_references, normalized_predictions)
        )
    else:
        normalized_wer = 0.0

    return {
        "wer": normalized_wer,
        "wer_raw": raw_wer,
        "wer_normalized": normalized_wer,
    }


def make_compute_metrics(processor: Any) -> Callable[[Any], dict[str, float]]:
    """Build a Hugging Face Seq2SeqTrainer metric callback for Whisper.

    The callback copies label IDs before replacing the -100 loss mask, so
    evaluation never mutates the trainer-owned prediction object.
    """

    def compute_metrics(prediction: Any) -> dict[str, float]:
        pred_ids = prediction.predictions
        if isinstance(pred_ids, tuple):
            pred_ids = pred_ids[0]

        label_ids = np.array(prediction.label_ids, copy=True)
        label_ids[label_ids == -100] = processor.tokenizer.pad_token_id

        pred_str = processor.tokenizer.batch_decode(
            pred_ids,
            skip_special_tokens=True,
        )
        label_str = processor.tokenizer.batch_decode(
            label_ids,
            skip_special_tokens=True,
        )
        return compute_wer_metrics(pred_str, label_str)

    return compute_metrics
