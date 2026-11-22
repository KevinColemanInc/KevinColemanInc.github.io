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

To generate narration, install the dependencies and run the audio command from
the site's root:

```sh
python3.12 -m venv /tmp/coleman-blog-tts
/tmp/coleman-blog-tts/bin/python -m pip install -r plugins/jekyll-blog-audio/scripts/requirements-blog-audio.txt
BLOG_TTS_PYTHON=/tmp/coleman-blog-tts/bin/python bundle exec ruby plugins/jekyll-blog-audio/scripts/build-blog-audio.rb
```

The first run downloads public model weights. Inference runs locally using
CUDA, Apple Metal, or CPU. The audio command renders a temporary copy of the
site, reuses completed clips and word timings from `.blog-audio-cache/`, and
publishes the audio for the next Jekyll build or serve.

On Apple Silicon, the optional MLX runtime uses the converted 8-bit Chatterbox
Turbo checkpoint and its own cache entries. Run it from an environment with
access to the Mac's Metal GPU.

```sh
python3.12 -m venv /tmp/coleman-blog-mlx
/tmp/coleman-blog-mlx/bin/python -m pip install mlx-audio==0.4.5 faster-whisper==1.2.1
BLOG_TTS_DEVICE=mlx BLOG_TTS_PYTHON=/tmp/coleman-blog-mlx/bin/python bundle exec ruby plugins/jekyll-blog-audio/scripts/build-blog-audio.rb
```

Click or keyboard-activate a prose block to listen from there. Links and text
selection retain their usual behavior. The player highlights each word where
timing data matches the article, and highlights the block otherwise. To adapt
the player colors to a different theme, set the CSS custom properties
`--blog-audio-accent`, `--blog-audio-muted`, `--blog-audio-border`, and
`--blog-audio-background`.

## GitHub Pages

Select GitHub Actions as the Pages publishing source. The workflow builds
eight audio cache shards in parallel, assembles the generated audio, and then
builds the Pages artifact.
