# Jekyll Blog Audio

This Jekyll plugin generates article narration locally with Chatterbox Turbo,
aligns spoken words with the rendered article, and adds a player to the post
layout. It works with Jekyll 4.3. Generating narration requires Python 3.12 and FFmpeg.

## Install

Add the gem to the site's `jekyll_plugins` group in its Gemfile. For this
repository, the gem is already registered as a local path dependency.

```ruby
group :jekyll_plugins do
  gem "jekyll-blog-audio", path: "plugins/jekyll-blog-audio"
end
```

Place `{% blog_audio_player %}` in the post layout and render the article inside
`<div class="post-content">{{ content }}</div>`. Set `blog_audio: false` in a
post's front matter to omit narration for that post.

Run `bundle exec jekyll serve` to preview the site, or `bundle exec jekyll build`
to build it. Both commands use previously generated audio from
`.blog-audio-cache/published/`. A post gets a player only when its manifest and
all referenced clips are available.

With uv and FFmpeg installed, run the audio command from the site's root.
Make uses uv to set up Python 3.12 and the audio dependencies in
`.venv-blog-tts/` on first use.

```sh
make generate-tts
```

Set `BLOG_TTS_PYTHON` to use an existing Python environment with the audio
dependencies installed.

The first run downloads public model weights. Inference runs locally using
CUDA, Apple Metal, or CPU. The audio command renders posts in a temporary
directory and generates missing MP3 clips in `.blog-audio-cache/`. To align
the clips and prepare them for the Jekyll player, run
`bundle exec ruby plugins/jekyll-blog-audio/scripts/build-blog-audio.rb`
with `BLOG_TTS_PYTHON=.venv-blog-tts/bin/python` or your Python override, and
the same device setting.

On Apple Metal, the generator logs live tensor memory and total Metal driver
memory after each clip's cache cleanup. It compares early and late medians
after warmup and restarts the process every 100 newly generated clips. Rising
live memory points to retained tensors. A rising driver total with steady live
memory points to allocations outside live tensors, which can include framework
caches. If both stay near baseline but a clip runs out of memory, check the
allocation size in the failure log for a transient peak. Compare several
process batches before attributing growth to a leak.

Both runtimes condition every chunk on the included male voice sample. Changing
the reference audio or sampling settings invalidates cached clips.

The sample is the first ten seconds of Garth Comira's reading of Marion Bryce's
*The Ashiel Mystery*, resampled to 24 kHz mono. The recording is from
[LibriSpeech](https://www.openslr.org/12/) via
[librosa's libri1 example](https://librosa.org/doc/dev/recordings.html)
and is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

On Apple Silicon, the optional MLX runtime uses the converted 8-bit Chatterbox
Turbo checkpoint and its own cache entries. Run it from an environment with
access to the Mac's Metal GPU.

```sh
python3.12 -m venv /tmp/coleman-blog-mlx
/tmp/coleman-blog-mlx/bin/python -m pip install mlx-audio==0.4.5 faster-whisper==1.2.1
BLOG_TTS_DEVICE=mlx BLOG_TTS_PYTHON=/tmp/coleman-blog-mlx/bin/python make generate-tts
```

Click or keyboard-activate a prose block to listen from there. During playback,
Back and Next jump to the start of the previous or next prose block. Links and text
selection retain their usual behavior. The player highlights each word where
timing data matches the article, and highlights the block otherwise. To adapt
the player colors to a different theme, set the CSS custom properties
`--blog-audio-accent`, `--blog-audio-muted`, `--blog-audio-border`, and
`--blog-audio-background`.

## GitHub Pages

Select GitHub Actions as the Pages publishing source. The workflow builds
eight audio cache shards in parallel, assembles the generated audio, and then
builds the Pages artifact.
