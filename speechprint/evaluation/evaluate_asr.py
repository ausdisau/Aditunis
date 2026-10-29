#!/usr/bin/env python3
"""Offline ASR scorer. Consumes approved JSONL predictions, never raw audio.
Example row: {"speaker_id":"spk_01","split":"test","reference":"hello world","hypothesis":"hello"}
Separate speakers by split and check near-duplicate sampling upstream.
"""
import argparse
import json
import re
import sys
from collections import defaultdict

def norm(text):
    return re.findall(r"\w+", text.casefold(), flags=re.UNICODE)

def dist(a, b):
    previous = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        current = [i]
        for j, y in enumerate(b, 1):
            current.append(min(current[-1] + 1, previous[j] + 1, previous[j-1] + (x != y)))
        previous = current
    return previous[-1]

def score(records):
    groups = defaultdict(lambda: {"word_errors": 0, "words": 0, "character_errors": 0, "characters": 0, "utterances": 0})
    split_by_speaker = defaultdict(set)
    for n, row in enumerate(records, start=1):
        if not isinstance(row, dict):
            raise ValueError(f"Line {n}: expected JSON object")
        for key in ("speaker_id", "split", "reference", "hypothesis"):
            if key not in row or not isinstance(row[key], str):
                raise ValueError(f"Line {n}: missing string {key}")
        if not row["speaker_id"] or not row["split"]:
            raise ValueError(f"Line {n}: speaker and split cannot be empty")
        ref, hyp = norm(row["reference"]), norm(row["hypothesis"])
        refchars, hypchars = list("".join(ref)), list("".join(hyp))
        if not ref:
            raise ValueError(f"Line {n}: empty reference after normalisation")
        split_by_speaker[row["speaker_id"]].add(row["split"])
        key = row["speaker_id"]
        group = groups[key]
        group["word_errors"] += dist(ref, hyp)
        group["words"] += len(ref)
        group["character_errors"] += dist(refchars, hypchars)
        group["characters"] += len(refchars)
        group["utterances"] += 1
    leakage = {speaker: sorted(splits) for speaker, splits in split_by_speaker.items() if len(splits) > 1}
    if leakage:
        raise ValueError("Speaker-overlap across splits: " + json.dumps(leakage))
    speakers = {}
    for name, g in groups.items():
        speakers[name] = {"wer": round(g["word_errors"] / g["words"], 5),
                          "cer": round(g["character_errors"] / g["characters"], 5) if g["characters"] else None,
                          "utterances": g["utterances"]}
    word_errors = sum(g["word_errors"] for g in groups.values())
    word_count = sum(g["words"] for g in groups.values())
    char_errors = sum(g["character_errors"] for g in groups.values())
    char_count = sum(g["characters"] for g in groups.values())
    return {"speakers": speakers, "micro_wer": word_errors/word_count if word_count else None,
            "micro_cer": char_errors/char_count if char_count else None,
            "speaker_macro_wer": sum(s["wer"] for s in speakers.values())/len(speakers) if speakers else None,
            "count_speakers": len(speakers),
            "note": "Evaluate personal-enrolment versus personal-test separately. No diagnosis inference."}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("predictions_jsonl", help="De-identified, authorised test predictions; no audio")
    parser.add_argument("--output", help="Optional JSON output; avoid public paths for real speaker metrics")
    args = parser.parse_args()
    with open(args.predictions_jsonl, "r", encoding="utf8") as file:
        results = score(json.loads(line) for line in file if line.strip())
    report = json.dumps(results, indent=2, ensure_ascii=False)
    if args.output:
        with open(args.output, "w", encoding="utf8") as f:
            f.write(report + "\n")
    else:
        print(report)

if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, json.JSONDecodeError) as err:
        print(f"Evaluation blocked: {err}", file=sys.stderr)
        sys.exit(2)
