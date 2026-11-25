# frozen_string_literal: true

require "jekyll"
require "json"

module JekyllBlogAudio
  ROOT = File.expand_path("..", __dir__)
  ASSETS = %w[blog-audio.css blog-audio.js].freeze
  OUTPUT = "published-blog-audio"

  class Player < Liquid::Tag
    def render(context)
      page = context["page"]
      return "" if page["blog_audio"] == false

      url = page["url"]
      path = url.end_with?("/") ? "#{url}index.html" : url
      path += ".html" unless path.end_with?(".html")
      manifest_url = "#{path}.audio.json"

      site = context.registers[:site]
      return "" unless ENV["JEKYLL_BLOG_AUDIO_PREPARE"] == "1" ||
                       JekyllBlogAudio.complete?(site, manifest_url)

      context.stack do
        context["audio_manifest"] = manifest_url
        template = File.read(File.join(__dir__, "player.html"), encoding: "UTF-8")
        Liquid::Template.parse(template).render!(context)
      end
    end
  end

  def self.complete?(site, manifest_url)
    root = File.join(site.source, OUTPUT)
    manifest = File.join(root, Jekyll::URL.unescape_path(manifest_url))
    payload = JSON.parse(File.read(manifest, encoding: "UTF-8"))
    return false unless payload.is_a?(Hash)

    segments = payload["segments"]
    segments.is_a?(Array) && !segments.empty? && segments.all? do |segment|
      audio = segment["audio"] if segment.is_a?(Hash)
      next false unless audio.is_a?(String)

      path = File.expand_path(audio, File.dirname(manifest))
      path.start_with?("#{root}/assets/blog-audio/") && File.file?(path) && File.size?(path)
    end
  rescue Errno::ENOENT, JSON::ParserError, TypeError
    false
  end
end

Liquid::Template.register_tag("blog_audio_player", JekyllBlogAudio::Player)

Jekyll::Hooks.register :site, :post_read do |site|
  JekyllBlogAudio::ASSETS.each do |name|
    site.static_files << Jekyll::StaticFile.new(site, JekyllBlogAudio::ROOT, "assets", name)
  end

  next if ENV["JEKYLL_BLOG_AUDIO_PREPARE"] == "1"

  root = File.join(site.source, JekyllBlogAudio::OUTPUT)
  Dir.glob(["**/*.html.audio.json", "assets/blog-audio/*.mp3"], base: root).each do |path|
    site.static_files << Jekyll::StaticFile.new(site, root, File.dirname(path), File.basename(path))
  end
end
