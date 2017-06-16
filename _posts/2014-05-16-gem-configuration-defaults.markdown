---
layout: post
title: "Gem Configuration Defaults"
date: 2014-05-16 22:48:09 -0400
comments: true
categories: 
---

Recently I have been working on connecting to social media websites via oAuth gems like twitter and koala.  I discovered a neat trick for initializing these gems with environment variables so that you don't have to be passing in the variables every time you want to create a new instance of them.

For this example, I am going to use the twitter gem.  Out of the box, its initializer looks like this taken from their docs:
```ruby
client = Twitter::REST::Client.new do |config|
  config.consumer_key        = "YOUR_CONSUMER_KEY"
  config.consumer_secret     = "YOUR_CONSUMER_SECRET"
  config.access_token        = "YOUR_ACCESS_TOKEN"
  config.access_token_secret = "YOUR_ACCESS_SECRET"
end
```

This is pretty clunky if you ask me, especially if you plan on accessing your users data in a variety of different places in your code.  We can make this more DRY by doing setting the consumer key and consumer secret in an initializer override like this

```ruby initializers/twitter.rb
Twitter::REST::Client.class_eval do
  def initialize_with_default_settings(options = {})
    options[:consumer_key] ||= Rails.application.secrets.fb_app_id
    options[:consumer_secret] ||= Rails.application.secrets.fb_secret
    initialize_without_default_settings(options)
  end 

  alias_method_chain :initialize, :default_settings 
end
```

Using the [alias_method_chain](http://weblog.rubyonrails.org/2006/4/26/new-in-rails-module-alias_method_chain/), we can sneak in some behaviors into the twitter client that weren't originally there, thus allowing us to not need to supply the consumer key every time we want to create a new client.  Now we can do things like this:

```ruby
client = Twitter::REST::Client.new do |config|
  config.access_token        = user.access_token
  config.access_token_secret = user.access_token_secret
```

Since the consumer key never changes across calls, this keeps our code that much simpler.
lowing us to not need to supply the consumer key every time we want to create a new client.  Now we can do things like this:

```ruby
client = Twitter::REST::Client.new do |config|
  config.access_token        = user.access_token
  config.access_token_secret = user.access_token_secret
```

Since the consumer key never changes across calls, this keeps our code that much simpler.