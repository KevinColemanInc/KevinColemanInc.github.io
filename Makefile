.PHONY: generate-tts publish-tts
generate-tts:
	BLOG_TTS_PYTHON="$(BLOG_TTS_PYTHON)" bundle exec ruby plugins/jekyll-blog-audio/scripts/build-blog-audio.rb --clips-only

publish-tts:
	BLOG_TTS_PYTHON="$(BLOG_TTS_PYTHON)" bundle exec ruby plugins/jekyll-blog-audio/scripts/build-blog-audio.rb

ifeq ($(origin BLOG_TTS_PYTHON),undefined)
BLOG_TTS_PYTHON := .venv-blog-tts/bin/python
generate-tts publish-tts: .venv-blog-tts/.installed

.venv-blog-tts/.installed: plugins/jekyll-blog-audio/scripts/requirements-blog-audio.txt
	uv venv --allow-existing --python 3.12 .venv-blog-tts
	uv pip install --python "$(BLOG_TTS_PYTHON)" -r "$<"
	touch "$@"
endif
