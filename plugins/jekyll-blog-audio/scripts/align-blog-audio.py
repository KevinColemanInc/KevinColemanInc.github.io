#!/usr/bin/env python3
"""Match spoken word timings to the rendered article text."""
import argparse
from difflib import SequenceMatcher
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unicodedata


def word_key(word):
    return "".join(character for character in unicodedata.normalize("NFKC", word).casefold()
                   if character.isalnum())


def word_timings(model, audio, text):
    import numpy as np

    decoded = subprocess.run([
        "ffmpeg", "-nostdin", "-v", "error", "-i", audio,
        "-f", "f32le", "-ar", "16000", "-ac", "1", "pipe:1",
    ], check=True, stdout=subprocess.PIPE).stdout
    samples = np.frombuffer(decoded, dtype="<f4")
    transcript, _ = model.transcribe(samples, language="en", beam_size=1,
                                      condition_on_previous_text=False, word_timestamps=True)
    source = [(index, key) for index, word in enumerate(text.split()) if (key := word_key(word))]
    spoken = [(word, key) for segment in transcript for word in segment.words or []
              if (key := word_key(word.word))]
    if not source or not spoken:
        return []
    matches = SequenceMatcher(None, [key for _, key in source], [key for _, key in spoken],
                              autojunk=False).get_matching_blocks()
    matched = sum(match.size for match in matches)
    if matched / max(len(source), len(spoken)) < 0.8:
        return []
    timings = []
    for original, recognized, size in matches:
        for offset in range(size):
            word = spoken[recognized + offset][0]
            if word.start < word.end and word.probability >= 0.5:
                timings.append([source[original + offset][0], round(word.start, 3), round(word.end, 3)])
    return timings


def write_json(path, payload):
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                     delete=False) as output:
        try:
            json.dump(payload, output, ensure_ascii=False)
            output.close()
            os.chmod(output.name, 0o644)
            os.replace(output.name, path)
        finally:
            Path(output.name).unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site", type=Path)
    parser.add_argument("--cache", type=Path, default=Path(".blog-audio-cache"))
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    model = None
    aligned = 0
    for manifest in sorted(args.site.rglob("*.audio.json")):
        payload = json.loads(manifest.read_text(encoding="utf-8"))
        if not payload.get("model", "").startswith("Chatterbox Turbo"):
            continue
        for segment in payload["segments"]:
            audio = manifest.parent / segment["audio"]
            timing_file = args.cache / (audio.stem + ".whisper-base-v1.json")
            if timing_file.is_file():
                timings = json.loads(timing_file.read_text(encoding="utf-8"))
            else:
                if model is None:
                    from faster_whisper import WhisperModel
                    model = WhisperModel("base", device="cpu", compute_type="int8", cpu_threads=4)
                timings = word_timings(model, audio, segment["text"])
                write_json(timing_file, timings)
                aligned += 1
                if aligned == 1 or aligned % 100 == 0:
                    print(f"Checked word timings for {aligned} new clips.", flush=True)
            if timings:
                segment["words"] = timings
        write_json(manifest, payload)
    print(f"Finished word timing alignment for {aligned} new clips.", flush=True)


if __name__ == "__main__":
    main()
