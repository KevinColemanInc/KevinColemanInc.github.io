# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name = "jekyll-blog-audio"
  spec.version = "0.1.0"
  spec.summary = "Local Chatterbox narration and a synchronized article player for Jekyll"
  spec.authors = ["Kevin Coleman"]
  spec.files = Dir["lib/*", "assets/*", "scripts/*.py", "scripts/*.rb", "scripts/requirements-blog-audio.txt", "README.md"]
  spec.required_ruby_version = ">= 3.1"
  spec.add_dependency "jekyll", "~> 4.3"
end
