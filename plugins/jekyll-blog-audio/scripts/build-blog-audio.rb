# frozen_string_literal: true

require "fileutils"
require "tmpdir"

clips_only = ARGV.delete("--clips-only")
abort "Usage: #{$PROGRAM_NAME} [--clips-only]" unless ARGV.empty?

Dir.mktmpdir("jekyll-blog-audio-") do |site|
  $stdout.puts "Building Jekyll site to find clips for TTS."
  $stdout.flush
  abort "Jekyll build failed." unless system(
    { "JEKYLL_BLOG_AUDIO_PREPARE" => "1" },
    "bundle", "exec", "jekyll", "build", "--destination", site, "--disable-disk-cache"
  )

  python = ENV.fetch("BLOG_TTS_PYTHON", "python3")
  cache = File.expand_path(".blog-audio-cache")
  shard = ENV["JEKYLL_BLOG_AUDIO_SHARD"]
  args = [site, "--cache", cache, "--device", ENV.fetch("BLOG_TTS_DEVICE", "auto")]
  args.concat(["--shard", shard]) if shard
  args << "--clips-only" if clips_only
  abort "Blog audio generation failed. See the plugin README for setup." unless system(
    python, File.join(__dir__, "generate-blog-audio.py"), *args
  )
  next if clips_only

  abort "Blog audio alignment failed. See the plugin README for setup." unless system(
    python, File.join(__dir__, "align-blog-audio.py"), site, "--cache", cache
  )

  unless shard
    output = File.expand_path("published-blog-audio")
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
