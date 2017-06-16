---
layout: post
title: "Angularjs Rails and SEO Part 2"
date: 2014-10-07 20:26:43 -0400
comments: true
categories:
---
<img src="/images/beach.jpeg"  alt="beach" title="Angularjs Rails and SEO Part 2" class="banner-img"  />

This is a continuation post from [Angularjs Rails and SEO Part 1](/blog/2014/10/03/angularjs-rails-seo/).

Now we need to configure Ruby on Rails to redirect Google's requests to get the non-ajax version of the page.  Google flags requests by replacing the '#!' in the url with `?_escaped_fragment_=` so you can know the route it is trying to fetch.

To catch this, we will add a `before_filter` to the application controller to watch for the `_escaped_fragment_` parameter.  This could will look like:

```ruby application_controller.rb
class ApplicationController < ActionController::Base
  protect_from_forgery

  before_filter :catch_escaped_fragment

  protected

  def catch_escaped_fragment
    if fragment = params[:_escaped_fragment_]
      # Build the original url
      base_url = "#{request.protocol}#{request.host_with_port}#{request.path}"
      url_with_hash = "#{base_url}#!#{params[:_escaped_fragment_]}"

      # Render it with the PhantomJS script and return the result
      command = "phantomjs '#{Rails.root}/lib/phantomjs/ember_to_static.js' '#{url_with_hash}' silence"
      result = `#{command}`

      render text: result
    end
  end
end
```

This rails application controller code will trigger the phantomjs script we wrote in the previous blog post.  Since it asks to run it in silent mode, we can take the entire log output of the script (which should be the completed AngularJS application) and return that to google.

## Rails concurrency
Because this methodology is blocking the thread request, when phantomjs tries to fetch the angularjs page, the website hangs. Because rails only executes one request at a time, phantomJS's request will sit and wait forever, since the request it is currently in will never finish.   To fix this, you will need to run your server with passenger.  Passenger can handle multiple requests in Ruby.

Add `gem 'passenger'` to your Gemfile. Then you can run it like this

and to run the application you can run `passenger -p 3000 -a 127.0.0.1`  if this is your first time running passenger with rails, you will have to follow an installation script.

Awesome! You are finished.
