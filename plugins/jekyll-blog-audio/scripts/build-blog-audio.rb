# frozen_string_literal: true

require "fileutils"
require "tmpdir"

Dir.mktmpdir("jekyll-blog-audio-") do |site|
  abort "Jekyll build failed." unless system(
    { "JEKYLL_BLOG_AUDIO_PREPARE" => "1" },
    "bundle", "exec", "jekyll", "build", "--destination", site
  )

  python = ENV.fetch("BLOG_TTS_PYTHON", "python3")
  cache = File.expand_path(".blog-audio-cache")
  shard = ENV["JEKYLL_BLOG_AUDIO_SHARD"]
  %w[generate align].each do |step|
    script = File.join(__dir__, "#{step}-blog-audio.py")
    args = [site, "--cache", cache]
    if step == "generate"
      args.concat(["--device", ENV.fetch("BLOG_TTS_DEVICE", "auto")])
      args.concat(["--shard", shard]) if shard
    end
    abort "Blog audio #{step} failed. See the plugin README for setup." unless system(python, script, *args)
  end

  unless shard
    output = File.join(cache, "published")
    # Publish clips before their manifests. Rename each file atomically so a build
    # running at the same time never reads a partially copied manifest or clip.
    Dir.mktmpdir("publish-", cache) do |staging|
      Dir.glob(["assets/blog-audio/*.mp3", "**/*.html.audio.json"], base: site).each do |path|
        destination = File.join(output, path)
        FileUtils.mkdir_p(File.dirname(destination))
        temporary = File.join(staging, File.basename(path))
        FileUtils.cp(File.join(site, path), temporary)
        File.rename(temporary, destination)
      end
    end
  end
end
