---
layout: post
title: "Rails and Redis URL Shortener in same application"
date: 2014-05-31 14:22:47 -0400
comments: true
categories: 
---
<img src="/images/locks.jpg" title="Redis key value storage" alt="locks" class="banner-img" />

Here is how to build a quick URL shortener in Rails 4.0 that shares the same application as the rest of your project, but is meant to run on a different domain using [Redis](http://redis.io/).

## Installing Redis
I recommend just using [brew](http://brew.sh/) to install redis.

```console
  brew install redis
```

Now to start it up, open a new terminal window and type:

```console
redis-server
```
## Link Model creation
Redis maybe great for quick access to information, but it does not guarantee like an [ACID compliant](http://en.wikipedia.org/wiki/ACID) database does that the information you put there will always be there.  Because it is a [noSQL](http://en.wikipedia.org/wiki/NoSQL) key-value store in memory, if the server it is running against restarts, its entire memory will be lost and you will need to have a reliable back up so you can re-generate the storage as needed.

```ruby migration
create_table "links", force: true do |t|
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "short_code", null: false
    t.string   "long_url", null: false
    t.integer "click_count", null: false
  end
```

The short code will be a 6-8 digit representation of the longer link which will be stored in the `long_url` field.  I also want to store the click count of these links, so I am adding that as an attribute as well.

## Link Model code
```ruby
class Link < ActiveRecord::Base
  validates :long_url, :click_count, :long_url, presence: true
  after_create :store_in_redis
  before_create :set_short_code

  def self.redis_url_key(short_code)
    'link:'+short_code+':url'
  end

  def self.redis_clicks_key(short_code)
    'link:'+short_code+':clicks'
  end

  def url
    Rails.application.secrets.shortener_domain + '/' + self.short_code if self.short_code
  end

  private

  def set_short_code
    self.short_code ||= loop do
      token = ($redis.incr('link:next:id') + Time.zone.now.to_i + rand(36**6)).to_s(36)
      break token unless Link.where(short_code: token).first
    end
  end
  
  def store_in_redis
    $redis.set(Link.redis_url_key(self.short_code), self.product.purchase_link)
    $redis.set(Link.redis_clicks_key(self.short_code),0)
  end

end
```
To start off, we have our validation code to ensure we don't accidently save bad data.  

We want to randomly generate a unique short code that is of appropriate length before we save this to the database.  In `set_short_code`, I keep trying to a valid randomly generated code based off of the time, an incrementor variable I am storing in Redis to ensure uniqueness.  Hypothetically if I got a request at the exact same second and somehow got the same random number, the Redis variable should protect against double urls.

After we write this to the database, we want to store the `short_code` and `long_url` in Redis.  We are doing it after we create, because if there are validation errors, then our Redis storage could contain bad data.  The key for the long url will look like 'link:uDk3nZz:url' and the click count will look like 'link:uDk3nZz:clicks'.  So when I want to pull out the long url, I simple say `$redis.get(Link.redis_url_key(params[:short_code]))` and I will have the long url, assuming it exists.  I can also update the click count in a similar fashion.

## Side note: Redis best practice
You should use the following naming scheme for all of your Redis keys, so that you have a standard way of retrieving data: [resource]:[id]:[attribute].

I wrote two helper methods to keep track of how we are naming the keys, so we don't end up with a bunch of magic strings everywhere in our project.  If we want to change how we store links in Redis, we only have to look one place, the link model. We will use them later when we create the controller so we know what fields to access with a given `short_code`.

## Links controller

```ruby links_controller.rb
class LinksController < ApplicationController
  def show
    url = $redis.get(Link.redis_url_key(params[:short_code]))
    raise ActionController::RoutingError.new('Not Found') unless url

    $redis.incr(Link.redis_clicks_key(params[:short_code]))
    
    redirect_to url, status: 302
  end
end
```

Use the `short_code` parameter, and that Redis url key method, we look up the long url.

If we can't find the url, then we rails a 404 page. If not, we continue and bump up the click count.  Redis has a built in incrementor so we wont have to worry about accidently loosing click counts during concurrent requests. and redirect ot the url we found in Redis.

## Configuring Routes to work across multiple domains

```ruby routes.rb
  constraints domain: "example.com" do
    get "/:short_code" => "likes#show", as: 'social_share'      
  end

```
We put this the top of our routes.rb file, because we want it to override any of the succeeding route configurations.  I recommend changing your host file to point dev.example.com to 127.0.0.1 so when you test this locally, you would hit your local machine as opposed to the production or staging server.

## To be continue
In the next article, I will be discussing on how to recover from a Redis failure.

