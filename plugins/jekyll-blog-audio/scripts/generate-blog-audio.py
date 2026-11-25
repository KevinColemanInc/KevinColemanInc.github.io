#!/usr/bin/env python3
"""Generate sentence MP3s and manifests alongside a built Jekyll site's posts."""

import argparse
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import shutil
from statistics import median
import subprocess
import sys
import tempfile
import textwrap
from time import monotonic
import warnings

BLOCKS = set("p div h1 h2 h3 h4 h5 h6 li blockquote td th br section".split())
HEADINGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
SKIP = set("pre script style iframe svg audio video template".split())
SENTENCE_END = re.compile(r"""[.!?]+["'”’)]*(?=\s|$)""")
ABBREVIATION = re.compile(r"(?:\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc)|\b[A-Z]|(?:\b[A-Za-z]\.)+[A-Za-z])\.$", re.I)
ENCODING = ["-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "40k"]


class Post(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.has_player = False
        self.depth = 0
        self.skip = []
        self.sections = [[]]
        self.feed(html)
        self.close()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = (attrs.get("class") or "").split()
        if "blog-audio" in classes:
            self.has_player = True
        if not self.depth:
            if tag == "div" and "post-content" in classes:
                self.depth = 1
            return
        if tag == "div":
            self.depth += 1
        if tag in SKIP:
            self.skip.append(tag)
        if not self.skip and tag in HEADINGS:
            self.sections.append([])
        if not self.skip and tag in BLOCKS:
            self.sections[-1].append("\n")

    def handle_endtag(self, tag):
        if not self.depth:
            return
        if self.skip and tag == self.skip[-1]:
            self.skip.pop()
        if tag == "div":
            self.depth -= 1
        if not self.skip and tag in BLOCKS:
            self.sections[-1].append("\n")

    def handle_data(self, data):
        if self.depth and not self.skip:
            self.sections[-1].append(re.sub(r"\s+", " ", data))

    def segments(self):
        for fragments in self.sections:
            for line in "".join(fragments).splitlines():
                line = " ".join(line.split())
                if not line:
                    continue
                yield [
                    {"text": sentence}
                    for sentence in self.sentences(line)
                ]

    @staticmethod
    def sentences(line):
        start = 0
        for end in SENTENCE_END.finditer(line):
            sentence = line[start:end.end()].strip()
            if ABBREVIATION.search(sentence):
                continue
            yield from textwrap.wrap(sentence, width=350, break_on_hyphens=False)
            start = end.end()
        yield from textwrap.wrap(line[start:].strip(), width=350, break_on_hyphens=False)


MODEL = "Chatterbox Turbo"
MLX_MODEL = "Chatterbox Turbo (MLX 8-bit)"
VOICE_REFERENCE = Path(__file__).with_name("chatterbox-male.flac")
VOICE_TEMPERATURE = 0.5
VOICE_SEED = 42
MPS_CLIPS_PER_PROCESS = 100
MIB = 1024 ** 2


def cached_mp3(sentence, cache, profile):
    key = hashlib.sha256(f"{profile}\n{sentence}".encode()).hexdigest()
    return cache / (key + ".mp3")


class Chatterbox:
    def __init__(self, device):
        import torch
        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore", message=r"pkg_resources is deprecated as an API\.",
                category=UserWarning, module=r"perth\.perth_net"
            )
            from chatterbox.tts_turbo import ChatterboxTurboTTS

        self.torch = torch
        if device == "auto":
            if torch.cuda.is_available():
                device = "cuda"
            elif torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"
        torch.set_num_threads(min(4, os.cpu_count() or 1))
        self.device = device
        print(f"Loading {MODEL} on {device}.", flush=True)
        self.model = ChatterboxTurboTTS.from_pretrained(device=device)
        self.sample_rate = self.model.sr
        with torch.inference_mode():
            self.model.prepare_conditionals(str(VOICE_REFERENCE), exaggeration=0.0)

    def generate(self, sentence):
        try:
            waveform = self._generate(sentence)
        except RuntimeError as error:
            if self.device != "mps" or "MPS backend out of memory" not in str(error):
                raise
            print(f"MPS memory at failure: {error}", flush=True)
        else:
            if self.device == "mps":
                # Release unused Metal allocations between clips in long builds.
                self.torch.mps.empty_cache()
            return waveform

        # The failed inference's tensors can be released once its traceback is gone.
        self.torch.mps.empty_cache()
        print("MPS ran out of memory. Retrying this clip on CPU.", flush=True)
        return Chatterbox("cpu").generate(sentence)

    def _generate(self, sentence):
        with self.torch.inference_mode():
            self.torch.manual_seed(VOICE_SEED)
            return self.model.generate(sentence, temperature=VOICE_TEMPERATURE).detach().cpu().float().numpy()


class MPSMemoryLog:
    def __init__(self, mps):
        self.mps = mps
        self.samples = []
        live, driver = self.sample()
        print(
            f"MPS memory baseline after model load: live={live:.1f} MiB, driver={driver:.1f} MiB, "
            f"recommended={mps.recommended_max_memory() / MIB:.1f} MiB.", flush=True,
        )

    def sample(self):
        return self.mps.current_allocated_memory() / MIB, self.mps.driver_allocated_memory() / MIB

    def record(self, target, characters):
        live, driver = self.sample()
        self.samples.append((live, driver))
        print(
            f"MPS memory after cleanup, clip {len(self.samples)} ({target.stem}, {characters} chars): "
            f"live={live:.1f} MiB, driver={driver:.1f} MiB.", flush=True,
        )

    def summarize(self):
        # Skip warmup and compare disjoint windows to smooth per-clip fluctuations.
        samples = self.samples[5:]
        window = min(10, len(samples) // 2)
        if not window:
            print("MPS memory trend: too few clips after warmup to compare.", flush=True)
            return
        early, late = samples[:window], samples[-window:]
        early_live, early_driver = zip(*early)
        late_live, late_driver = zip(*late)
        live_delta = median(late_live) - median(early_live)
        driver_delta = median(late_driver) - median(early_driver)
        print(
            f"MPS memory trend across {len(self.samples)} clips, comparing early and late "
            f"{window}-clip medians after 5 warmup clips: live={live_delta:+.1f} MiB, "
            f"driver={driver_delta:+.1f} MiB, driver minus live={driver_delta - live_delta:+.1f} MiB.",
            flush=True,
        )


class MLXChatterbox:
    def __init__(self):
        import mlx.core as mx
        from mlx_audio.tts.utils import load_model

        self.mx = mx
        print(f"Loading {MLX_MODEL}.", flush=True)
        self.model = load_model("mlx-community/chatterbox-turbo-8bit")
        self.sample_rate = self.model.sample_rate
        self.model.prepare_conditionals(str(VOICE_REFERENCE), exaggeration=0.0)

    def generate(self, sentence):
        import numpy as np

        self.mx.random.seed(VOICE_SEED)
        parts = self.model.generate(text=sentence, temperature=VOICE_TEMPERATURE)
        return np.concatenate([np.asarray(part.audio) for part in parts])


def encode(synthesizer, sentence, destination):
    import numpy as np

    waveform = np.asarray(synthesizer.generate(sentence), dtype="<f4").reshape(-1)
    if not waveform.size or not np.isfinite(waveform).all() or np.max(np.abs(waveform)) < 0.001:
        raise RuntimeError("Chatterbox produced invalid or silent audio")
    with tempfile.TemporaryDirectory(dir=destination.parent) as temporary:
        mp3 = Path(temporary) / "speech.mp3"
        subprocess.run([
            "ffmpeg", "-nostdin", "-v", "error", "-abort_on", "empty_output",
            "-f", "f32le", "-ar", str(synthesizer.sample_rate), "-ac", "1", "-i", "pipe:0",
            *ENCODING, mp3,
        ], input=waveform.tobytes(), check=True)
        try:
            os.link(mp3, destination)
        except FileExistsError:
            # A concurrent build may have populated the same immutable cache entry.
            pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site", type=Path, help="Jekyll build directory")
    parser.add_argument("--cache", type=Path, default=Path(".blog-audio-cache"))
    parser.add_argument("--device", choices=("auto", "cpu", "mps", "cuda", "mlx"), default="auto")
    parser.add_argument("--shard", help="Zero-based INDEX/TOTAL for parallel builds")
    parser.add_argument("--clips-only", action="store_true", help="Generate cached MP3 clips only")
    args = parser.parse_args()
    if not args.site.is_dir():
        parser.error("build the Jekyll site first")
    args.cache.mkdir(parents=True, exist_ok=True)
    model_name = MLX_MODEL if args.device == "mlx" else MODEL
    voice_hash = hashlib.sha256(VOICE_REFERENCE.read_bytes()).hexdigest()
    profile = f"{model_name}\nmale-v1\n{voice_hash}\n{VOICE_TEMPERATURE}\n{VOICE_SEED}"
    print("Scanning posts and checking the TTS cache.", flush=True)
    posts = {}
    for html in sorted(args.site.rglob("*.html")):
        source = html.read_text(encoding="utf-8", errors="replace")
        if 'class="blog-audio"' in source:
            post = Post(source)
            if post.has_player:
                posts[html] = list(post.segments())

    clips = {
        segment["text"]: cached_mp3(segment["text"], args.cache, profile)
        for blocks in posts.values() for block in blocks for segment in block
    }
    if args.shard:
        try:
            shard, total = map(int, args.shard.split("/"))
            if not 0 <= shard < total:
                raise ValueError
        except ValueError:
            parser.error("--shard requires INDEX/TOTAL with 0 <= INDEX < TOTAL")
        clips = {text: path for text, path in clips.items() if int(path.stem, 16) % total == shard}
    missing = [(sentence, target) for sentence, target in clips.items() if not target.is_file()]
    total_clips = len(clips)
    cached = total_clips - len(missing)
    print(
        f"TTS {cached}/{total_clips} clips ready across {len(posts)} posts "
        f"({cached} cached, {len(missing)} pending). "
        f"ETA {'estimating' if missing else '0:00:00'}.",
        flush=True,
    )
    if missing:
        if not shutil.which("ffmpeg"):
            parser.error("FFmpeg is required to encode audio")
        synthesizer = MLXChatterbox() if args.device == "mlx" else Chatterbox(args.device)
        memory_log = MPSMemoryLog(synthesizer.torch.mps) if getattr(synthesizer, "device", None) == "mps" else None
        started = last_report = monotonic()
        remaining_chars = sum(len(sentence) for sentence, _ in missing)
        generated_chars = 0
        generated_clips = 0
        generation_seconds = 0.0
        for count, (sentence, target) in enumerate(missing, 1):
            try:
                if not target.is_file():
                    clip_started = monotonic()
                    encode(synthesizer, sentence, target)
                    generation_seconds += monotonic() - clip_started
                    generated_chars += len(sentence)
                    generated_clips += 1
                    if memory_log:
                        memory_log.record(target, len(sentence))
            except Exception as error:
                raise RuntimeError(f"Failed to generate clip {target.stem}: {sentence!r}") from error
            remaining_chars -= len(sentence)
            now = monotonic()
            restart_mps = (
                memory_log is not None
                and generated_clips >= MPS_CLIPS_PER_PROCESS
                and count < len(missing)
            )
            if count == 1 or now - last_report >= 10 or count == len(missing) or restart_mps:
                eta = "estimating"
                if not remaining_chars or generated_chars:
                    seconds = round(remaining_chars * generation_seconds / max(1, generated_chars))
                    minutes, seconds = divmod(seconds, 60)
                    hours, minutes = divmod(minutes, 60)
                    eta = f"{hours}:{minutes:02}:{seconds:02}"
                ready = cached + count
                print(
                    f"TTS {ready}/{total_clips} clips ready ({ready / total_clips:.1%}). "
                    f"Elapsed {now - started:.0f}s. ETA {eta}.",
                    flush=True,
                )
                last_report = now
            if restart_mps:
                # Model reloads within this process can retain Metal driver allocations.
                memory_log.summarize()
                print(f"Restarting the MPS process after {generated_clips} new clips.", flush=True)
                os.execv(sys.executable, [sys.executable, *sys.argv])
        if memory_log:
            memory_log.summarize()

    if args.clips_only:
        return

    output = args.site / "assets" / "blog-audio"
    output.mkdir(parents=True, exist_ok=True)
    for target in clips.values():
        shutil.copyfile(target, output / target.name)
    for html, blocks in posts.items():
        segments = []
        for block_number, block in enumerate(blocks):
            for segment in block:
                target = clips.get(segment["text"])
                if target is None:
                    continue
                segment["block"] = block_number
                segment["audio"] = Path(os.path.relpath(output / target.name, html.parent)).as_posix()
                segments.append(segment)
        if segments:
            manifest = html.with_name(html.name + ".audio.json")
            manifest.write_text(json.dumps({"model": model_name, "segments": segments}, ensure_ascii=False),
                                encoding="utf-8")
    print(f"Published {len(clips)} unique clips across {len(posts)} posts.", flush=True)


if __name__ == "__main__":
    main()
