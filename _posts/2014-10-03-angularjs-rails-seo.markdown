---
layout: post
title: "Angularjs Rails and SEO Part 1"
date: 2014-10-03 12:05:45 -0400
comments: true
categories:
---

<img src="/images/mountain.jpeg" alt="mountain" title="Angularjs Rails and SEO Part 1" class="banner-img"  />

## Intro
Today I was handed an interesting project around improve the SEO surface area of an [AngularJS](https://angularjs.org/) SPA for a client.  After a bit of research on how to handle this, I decided that I should roll my own tool to solve this problem as it will give me greater flexibility later as opposed to going with a SaaS app like [Prerender.io](http://Prerender.io).

## Basic Concept
Google says they are doing a much better job [rendering Javascript](http://googlewebmastercentral.blogspot.com.es/2014/05/understanding-web-pages-better.html) on websites.  Awesome! But what about the [other](http://bing.com) [guys](http://duckduckgo.com)?

What we are going to do is leverage [PhantomJS](http://phantomjs.org/) to render the angularjs code on the fly as the server requests the dynamic pages.  This way we don't have to deal with maintain a bunch of ERB files or pre-rendering static pages on our server.

The cost will be that the page load time will be a bit slower unfortunately and these requests will be expensive on memory, but we just want the fast (dev time-wise) solution to hit the ground.

## PhantomJS client
First you need to [install PhantomJS](http://phantomjs.org/download.html).  If you are using Heroku to host your application, you will need to configure Heroku to run phantomjs with [this build back](https://github.com/stomita/heroku-buildpack-phantomjs).

Unfortunately there isn't a great way to detect when the page is finished loading.  My trick to solve this problem is for all of the controllers to set a status flag on the `body` tag noting they are finished running.  Now all of my controllers look like this:

```coffeescript app/assets/javascripts/app/controllers/index.js.coffee
app.controller 'IndexCtrl', ($scope, $rootScope) ->
  ...
  $rootScope.status = 'ready';
```

and I have this on my `body` tag

```haml app/views/layouts/application.html.slim
  body data-status="{ { status } }"
```

So now I can watch the data-status to see when angular has finished running.

Now lets create a angularjs-to-static.js.coffee file.  This will take in a URL and spit out the html for the page using PhantomJS.

```coffeescript lib/phantomjs/angularjs_to_static.js.coffee
#
# angularjs_to_static.js.coffee
#
# This script takes a URL as argument. (In that order!)
# The script then runs the Javascript on this page and waits until Ember has finished loading.
# It then renders the resulting static HTML page to the console.
#

# Keep track of whether the page has already been exported. The 'setTimeout' mess might cause it to be exported multiple times.
exportPageContents = ->
  unless pageHasBeenExported
    pageHasBeenExported = true
    console.log page.content
    console.log "Finished." unless silence
    phantom.exit()
  return

#wait until angularjs says its ready
waitForStatus = (page, callback) ->
  expiration = (new Date()).getTime() + 10000

  # try and fetch the desired element from the page
  result = page.evaluate(->
    document.body
  )
  system.stderr.writeLine result

  # if desired element found then call callback after 50ms
  if result
    system.stderr.writeLine "- trigger found" unless silence
    window.setTimeout (->
      callback()
      return
    ), 50
    return

  # determine whether timeout is triggered
  finish = (new Date()).getTime()
  if finish > expiration
    system.stderr.writeLine "- timed out" unless silence
    callback()
    return

  # haven't timed out, haven't found object, so poll in another 100ms
  window.setTimeout (->
    waitForStatus page, waitForStatus
    return
  ), 100
  return

fs = require("fs")
system = require("system")
page = require("webpage").create()
pageHasBeenExported = false
script = undefined
url = undefined
silence = undefined
script = system.args[0]

if system.args.length < 2 or system.args.length > 3

  # Output usage info and exit.
  console.log "Usage: " + script + " URL [silence]"
  console.log "  URL: address to open and run"
  console.log "  silence: enter 'silence' (without quotes) to only output the page content and suppress info messages"
  phantom.exit 1
else
  url = system.args[1]
  silence = (system.args[2] is "silence")
  console.log "Will render " + url + "."  unless silence
  page.open url, (status) ->
    unless status is "success"
      console.log "Unable to load URL!"  unless silence
      phantom.exit()
    else

      # Start a long timeout. When the page still doesn't seem to have finished loading after 30s, something has likely gone wrong. This timeout prevents a hangup of the server.
      window.setTimeout (->
        exportPageContents()
        return
      ), 30000
      waitForStatus page, exportPageContents
    return
```

### Side note
Much of this script was borrowed from [Ember.js, Google Ajax crawling and Rails](http://www.pieterjongsma.com/2013/01/11/ember-google-ajax-rails.html), but I didn't like he was detecting with angularjs was finished.  He was waiting for the page to finish its server requests, added some padding time and then finished.  Waiting for the flag to be set is a better technique, because I know angular has finished.

Essentially this script takes in a URL, loads the page, and then waits for the flag to be set.  If the flag takes longer than 30s to be set, it bails and just renders what it has.  If you are on Heroku, you may need to shorten this flag to 15s, because [Heroku has a request timeout](https://devcenter.heroku.com/articles/request-timeout) of 30s.

[Part 2](/blog/2014/10/07/angularjs-rails-and-seo-part-2/)
