# Aditunis specialised speech-model runtime

Aditunis does **not** vendor model weights into GitHub. The repository keeps a reviewed model registry and lazy runtime adapters; weights are resolved from Hugging Face only when a model is explicitly requested.

## Why this boundary exists

Disordered speech is heterogeneous. A single recogniser should not be treated as universally authoritative. Aditunis therefore separates:

- population dysarthric ASR;
- speaker/personal adaptation;
- disfluency evidence;
- speech-phenotype evidence;
- condition-specific optional adapters;
- verbatim versus smoothed disfluency representation.

The model router never infers a diagnosis from speech. Condition-specific models are selected only when a condition tag is explicitly supplied by an authorised profile or workflow.

## Registered Hugging Face models

| Aditunis key | Hugging Face repository | Role | Licence/access | Runtime status |
| --- | --- | --- | --- | --- |
| `dysasr-parakeet-tdt` | `dys-asr/parakeet-tdt-0.6b-all-aug` | population dysarthric ASR | gated; licence reported as `other` | Transformers ASR pipeline; research only until licence review |
| `torgo-whisper-lora` | `dbarbera/whisper-small-torgo-dysarthria-lora` | dysarthria/personal ASR baseline | MIT | PEFT/Transformers lazy pipeline |
| `stuttering-wavlm-lora` | `pmootr/stuttering-detection-wavlm-lora` | disfluency sidecar | Apache-2.0 | PEFT/Transformers lazy pipeline |
| `dysarthria-severity-probe` | `jaesungbae/da-dsqa` | phenotype/recognition-difficulty sidecar | MIT | local reviewed adapter required |
| `huntingtons-parakeet` | `charleslwang/parakeet-tdt-0.6b-HD` | optional Huntington-disease ASR adapter | Apache-2.0 | explicit NeMo adapter required |
| `disfluency-smoothed-whisper` | `nazarkozak/whisper-small-disfluent-smoothed-lora` | smoothed/intended-speech research path | CC-BY-NC-SA-4.0 | research only |
| `disfluency-verbatim-whisper` | `nazarkozak/whisper-small-disfluent-verbatim-lora` | verbatim-speech research path | CC-BY-NC-SA-4.0 | research only |

The registry lives in `aditunis_ml/hf_models.py`. Runtime dispatch lives in `aditunis_ml/hf_runtime.py`.

## Production policy

Aditunis applies policy **before** downloading a model:

- gated models require explicit Hugging Face access and a token;
- models with unclear production rights are blocked in production mode;
- non-commercial models are blocked in production mode;
- `trust_remote_code=True` is not used by the default runtime;
- custom and NeMo architectures require a locally reviewed adapter;
- Hugging Face tokens must come from runtime secret management and must never be committed.

The current production-safe registry includes the MIT/Apache-2.0 models whose runtime or adapter boundary is explicitly defined. This is a software policy, not legal advice; deployment still requires licence review for the intended use.

## Install runtime dependencies

```bash
python -m pip install -r aditunis/ml/requirements-runtime.txt
```

The CI workflow intentionally installs only lightweight test dependencies and does not download model weights.

## Example: select a stack

```python
from aditunis_ml.hf_models import select_specialized_stack

stack = select_specialized_stack(
    deployment="production",
    hf_token_present=False,
    condition_tags=(),
)

print(stack.primary_asr)
# torgo-whisper-lora
```

For an explicitly configured Huntington-disease workflow:

```python
stack = select_specialized_stack(
    deployment="production",
    hf_token_present=False,
    condition_tags=("huntingtons-disease",),
)

print(stack.optional_condition_models)
# ('huntingtons-parakeet',)
```

Aditunis does not derive the condition tag from speech.

## Example: lazy-load a runtime model

```python
import os

from aditunis_ml.hf_runtime import HuggingFaceRuntime

runtime = HuggingFaceRuntime()

asr = runtime.load(
    "torgo-whisper-lora",
    deployment="production",
    hf_token=os.getenv("HF_TOKEN"),
    device="cuda:0",
)
```

The actual model is not imported or downloaded until `load()` is called.

For the gated DysASR Parakeet research model, access must first be accepted on Hugging Face and `HF_TOKEN` supplied through the runtime environment. Aditunis will reject the request before model loading when access is absent.

## User-control rule for disfluency

Verbatim and smoothed/intended representations are separate choices. Aditunis must never silently convert one into the other.

```python
stack = select_specialized_stack(
    deployment="research",
    hf_token_present=False,
    disfluency_representation="verbatim",
)
```

The current verbatim/smoothed Hugging Face adapters are non-commercial and therefore cannot be selected in Aditunis production mode.

## Next runtime adapters

Two models are registered but intentionally not auto-loaded yet:

1. `jaesungbae/da-dsqa` needs a locally reviewed severity-probe implementation so Aditunis does not execute arbitrary repository code.
2. `charleslwang/parakeet-tdt-0.6b-HD` needs a reviewed NeMo/Hugging Face snapshot adapter and interoperability test.

After those adapters are implemented, the next layer is a benchmark router comparing population ASR, personal ASR, phenotype sidecars, latency, WER, correction burden, and Aditunis Communication Recovery Rate on participant-disjoint prepared and spontaneous speech.
