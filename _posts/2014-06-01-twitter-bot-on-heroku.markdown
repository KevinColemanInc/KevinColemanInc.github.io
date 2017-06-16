---
layout: post
title: "Twitter bot on Heroku"
date: 2014-06-01 00:05:08 -0400
comments: true
categories: 
---
<img src="/images/alley.jpg" title="Twitter bot v1 on Heroku" alt="Alley way" class="banner-img" />

Inspired by the Technology Review article, [How Advanced Social bots Have Infiltrated Twitter](http://www.technologyreview.com/view/527746/how-advanced-socialbots-have-infiltrated-twitter/), I thought it would be an interesting to see how difficult it is to write a bot to generate followers over a given topic.

I think a first basic start would be to post proven social content from other sources (namely [reddit.com](http://reddit.com/)).  Version one of the bot will just repost the top article of the day on a given sub-reddit onto this twitter account.  Lets get started.

## Import the gems

First I need to create my `Gemfile` and reference these gems:

```ruby
source 'https://rubygems.org'

gem 'twitter'
gem 'redditkit'#, :git => 'https://github.com/samsymons/RedditKit.rb.git'
gem 'redis'
```

There are a number of reddit gems, but I found that [redditkit](https://github.com/samsymons/RedditKit.rb) seems to be the most maintained.

Redis will be used as our data store to prevent duplicate tweets.

## Twitter Bot code
```ruby twitter_bot.rb
require 'twitter'
require 'redditkit'
require 'redis'
require "open-uri"

KARMA_THRESHOLD=2000

```
First we need to require all of the resources.  Unfortunately these are not automatically loaded like they are in rails.  I set the KARMA_THRESHOLD to a score of 2000, so that we only share quality content.  `open-uri` will be used with the image upload.  If you upload the image as opposed to sharing the link, the photo will appear in the stream, thus giving it more exposure.

```ruby twitter_bot.rb
ENV["REDISCLOUD_URL"] ||= "redis://localhost:6379/"

if ENV["REDISCLOUD_URL"]
    uri = URI.parse(ENV["REDISCLOUD_URL"])
    $redis = Redis.new(:host => uri.host, :port => uri.port, :password => uri.password)
end
```

Since I am hosting this with Heroku, I need to set a default environment variable for the rediscloud_url which is set by the [Redis cloud addin](http://redislabs.com/redis-cloud)

Next I configure the twitter gem with the API keys I got from their website

```ruby twitter_bot.rb
client = Twitter::REST::Client.new do |config|
  config.consumer_key        = ""
  config.consumer_secret     = ""
  config.access_token        = ""
  config.access_token_secret = ""
end

authenticated_client = RedditKit::Client.new '', ''
posts = authenticated_client.links 'all', :category => :top, time: :hour
```
I also login to my reddit account and retrieve the links for the sub-reddit of my choice.

## Loop through all of the links and find something to share

```ruby twitter_bot.rb
posts.results.each do |link|
  if (link.score > KARMA_THRESHOLD && (link[:domain] == "imgur.com" || link[:domain] == "i.imgur.com")) && !($redis.get('link:'+link.id)) && !(link.title.include? "r/")
    
    if link.url.include? "i.imgur"
      image_url = link.url
    else
      image_url = link.url.gsub(/http:\/\//, 'http://i.') + ".jpg"
    end
   
    File.open('cringe.png', 'wb') do |fo|
      fo.write open(image_url).read
    end

    $redis.set('link:'+link.id, true)

    client.update_with_media(link.title + " #LOL ", File.new('cringe.png'))
    break
  end
end
```
I want to only select links with a high enough karma score, with an imgur image, and not in my redis store and not referencing another reddit thread.  I don't want them to include any reddit references in my tweets if I can help it.

Sometimes people post a link to the imgur page instead of directly to the link, so I need to change up the image_url as necessary depending on whether or not they did so.

Next I download the image so I can re-upload it to twitter later.   Next I create the token in my redis store so I don't accidently have any duplicate image links.  I check against that in the if statement above.

Now I update my twitter feed with the link title, a hash tag, and the new image I just downloaded.  Because I am running this on Heroku, the image saved to disk will get lost when the dyno gets killed with the scheduler ends.  So I don't really need to worry about clean up.

I want this to only run once, because twitter will get upset if they notice that fire off tweets in bursts.  I think once per day is a good starting ground and I can move up the frequency, as I get more and more brave.

## Deploy to Heroku

I need to make this a git repo, add my code so far.

```console
git init
git add .
git commit -m "first twitter bot commit!"
```

Now I need to make the [Heroku](http://heroku.com) application to run this under and push it up to the server
```console
heroku apps:create twitter-bot
git push heroku master
```

## Heroku Scheduler
Heroku comes with a free scheduler that I can run in daily increments, perfect for this application.  I set configure it so it runs `ruby twitter_bot.rb` every day at midnight, so users will be able to see my tweets in the morning when they wake up.

## In the future....
I plan on adding more content sources and more frequent posts.  I am running this along side the chrome extension [Followr](https://github.com/ztratar/followr), which is an automated tool for favoriting tweets of other users based on preset hash tags.  So far it has earned me 10 new followers and 3 new re-tweets.
