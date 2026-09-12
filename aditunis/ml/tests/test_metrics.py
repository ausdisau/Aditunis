from importlib import import_module


def _metrics_module():
    return import_module("aditunis_ml.metrics")


def test_reports_raw_and_normalized_wer_separately():
    module = _metrics_module()
    metrics = module.compute_wer_metrics(
        predictions=["Turn on the TV."],
        references=["turn on the tv"],
    )
    assert metrics["wer_raw"] > 0
    assert metrics["wer_normalized"] == 0
    assert metrics["wer"] == metrics["wer_normalized"]


def test_filters_references_that_normalize_to_empty_text():
    module = _metrics_module()
    metrics = module.compute_wer_metrics(
        predictions=["anything", "hello"],
        references=["!!!", "hello"],
    )
    assert metrics["wer_normalized"] == 0


def test_huggingface_callback_does_not_mutate_label_ids():
    import numpy as np

    module = _metrics_module()

    class Tokenizer:
        pad_token_id = 0

        def batch_decode(self, token_ids, skip_special_tokens=True):
            rows = token_ids.tolist()
            return ["hello" if row[-1] == 1 else "" for row in rows]

    class Processor:
        tokenizer = Tokenizer()

    class Prediction:
        predictions = np.array([[1]])
        label_ids = np.array([[-100, 1]])

    pred = Prediction()
    original = pred.label_ids.copy()
    callback = module.make_compute_metrics(Processor())
    metrics = callback(pred)

    assert metrics["wer"] == 0
    assert np.array_equal(pred.label_ids, original)
