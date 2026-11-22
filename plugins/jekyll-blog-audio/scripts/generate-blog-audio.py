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
import subprocess
import tempfile
import textwrap

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


def cached_mp3(sentence, cache, model=MODEL):
    version = "local-chatterbox-turbo-mlx-8bit-v1" if model == MLX_MODEL else "local-chatterbox-turbo-v1"
    key = hashlib.sha256(f"{version}\n{sentence}".encode()).hexdigest()
    return cache / (key + ".mp3")


class Chatterbox:
    def __init__(self, device):
        import torch
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
        print(f"Loading {MODEL} on {device}.", flush=True)
        self.model = ChatterboxTurboTTS.from_pretrained(device=device)
        self.sample_rate = self.model.sr

    def generate(self, sentence):
        with self.torch.inference_mode():
            return self.model.generate(sentence).detach().cpu().float().numpy()


class MLXChatterbox:
    def __init__(self):
        from mlx_audio.tts.utils import load_model

        print(f"Loading {MLX_MODEL}.", flush=True)
        self.model = load_model("mlx-community/chatterbox-turbo-8bit")
        self.sample_rate = self.model.sample_rate

    def generate(self, sentence):
        import numpy as np

        return np.concatenate([np.asarray(part.audio) for part in self.model.generate(text=sentence)])


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
    args = parser.parse_args()
    if not args.site.is_dir():
        parser.error("build the Jekyll site first")
    args.cache.mkdir(parents=True, exist_ok=True)
    model_name = MLX_MODEL if args.device == "mlx" else MODEL
    posts = {}
    for html in sorted(args.site.rglob("*.html")):
        source = html.read_text(encoding="utf-8", errors="replace")
        if 'class="blog-audio"' in source:
            post = Post(source)
            if post.has_player:
                posts[html] = list(post.segments())

    clips = {
        segment["text"]: cached_mp3(segment["text"], args.cache, model_name)
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
    print(f"{len(clips)} unique clips across {len(posts)} posts. Generating {len(missing)} clips.", flush=True)
    if missing:
        if not shutil.which("ffmpeg"):
            parser.error("FFmpeg is required to encode audio")
        synthesizer = MLXChatterbox() if args.device == "mlx" else Chatterbox(args.device)
        for count, (sentence, target) in enumerate(missing, 1):
            try:
                if not target.is_file():
                    encode(synthesizer, sentence, target)
            except Exception as error:
                raise RuntimeError(f"Failed to generate clip {target.stem}: {sentence!r}") from error
            if count == 1 or count % 25 == 0 or count == len(missing):
                print(f"Generated {count}/{len(missing)} clips.", flush=True)

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
