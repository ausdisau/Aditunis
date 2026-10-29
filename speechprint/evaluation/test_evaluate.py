import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from evaluate_asr import score
def test_basic():
    result=score([{"speaker_id":"synthetic_a","split":"test","reference":"hello world","hypothesis":"hello"}])
    assert result["micro_wer"]==.5
def test_split_leakage():
    try:
        score([{"speaker_id":"same","split":"train","reference":"hello","hypothesis":"hello"},
               {"speaker_id":"same","split":"test","reference":"world","hypothesis":"world"}])
    except ValueError as e:
        assert "Speaker-overlap" in str(e)
    else:
        assert False, "Leakage must be rejected"
