---
layout: post
title: "Limited Retry Pattern"
date: 2015-07-08 23:43:12 -0700
comments: true
categories: 
---

<img src="/images/horse_statue.jpg" alt="horse statue" title="Limited Retry Pattern" class="banner-img" />

The limited retry pattern is a great tool for retrying method calls a limited number of times.  In instances where I want to make an API with a limited number of tries. I would have my method look like this:

```ruby limited_retry.rb

def api_call(args) 
  @retries = 0
  begin
    do_api_call(args)
  rescue ApiError, Timeout 
    @retries += 1
    retry if @retries < 5
  end
end

```

The retry method is really powerful in ruby.  If a block is rescued, by calling "retry" it will attempt to run that block again.  For example, if your server has a spotty connection, it would make sense to retry an API request twice if it failed to reach the server.

The [DefRetry gem](https://github.com/DiegoSalazar/DefRetry) by DiegoSalazar can be used to add DSL to your ruby classes that you want to retry a few times.