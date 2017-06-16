---
layout: post
title: "One Rails App Two Web Applications"
date: 2014-10-09 20:11:45 -0400
comments: true
categories:
---

<img src="/images/mountains.jpeg" alt="mountains" title="One Rails App Two Web Applications" class="banner-img"  />

When building a rails application, sometimes it is quicker to build one code base that is shared on two completely different frontend applications.  I am going to discuss the design approaches I used to segregate the two rails websites within a single rails application base.

## Configuring the Front End
My first 'trick' is to build the system such that all interactions are run through an RESTful API.  This gives one surface area for applications (front end apps or mobile or whatever) and it reduces the amount of duplication that maybe experienced across the two different websites.

For my projects, I lean towards AngularJS, mainly because there is a strong community backing the technology, not to mention this is one of Google's babies.

Both of these websites will have a unique look and feel as well as style sheets and html designs.

### Break apart the CSS files
I divided my assets/stylesheets folder to look like this:

```
  assets/stylesheets/application.css
  assets/stylesheets/app1/app1.css
  assets/stylesheets/app2/app2.css
```

```css application.css
/*
 *= require_self
 */
```

Note how I removed the standard `require_tree .` line to prevent it from auto loading the entire project.  I just want it to load global attributes for the two applications.

```css app1.css.scss
@import "compass/reset"
@import "compass"

@import "app1/partials/variables"
@import "app1/partials/typography"
@import "app1/partials/footer"
@import "app1/partials/alerts"
@import "app1/partials/buttons"
@import "app1/partials/sprites"
@import "app1/partials/navigation"
@import "app1/partials/modals"
@import "app1/partials/framework_and_overrides"

@import "app1/pages/bootstrap_override"
@import "app1/pages/questions"
@import "app1/pages/content"
```

Here I am explicitly including the app1.css resources in app1.

application.css will include styling that is shared between the two applications.  An example, might be your frameworks like bootstrap.

appN.css will include the styles that are unique to your web application.  You should create an /assets/stylesheets/app1/ folder to house all of your style sheets for that specific app.

In my layouts view, you will only want to be loading app1 and application when a user requests an app1 website and app2 and application when the user requests an app2 website.

By checking the request host, you can determine the domain the user is on you can decide which css files need to be delivered to the client.  The host check should be offloaded to a helper method that would like:

```ruby
  def app1?
    'app1.com' == request.host
  end
```

In the rails views layout folder, you only include the style sheets that are used

```ruby layout.html.slim
== stylesheet_link_tag "application", :media => 'all'
- if app1?
  == stylesheet_link_tag "app1", :media => 'all'
- elsif app2?
  == stylesheet_link_tag "app2", :media => 'all'
```

You need to tell rails to precompile these new css files

```ruby config/initializers/assets.rb
Rails.application.config.assets.precompile += %w( app1.css app2.css )
```

### Javascript Divorce

You can use a similar technique to break up your javascript files into two projects

```ruby layout.html.slim
  == javascript_include_tag 'application'
  - if app1?
    == javascript_include_tag 'app1'
  - elsif app2?
    == javascript_include_tag 'app2'
```

Don't forget to tell rails to precompile these new assets.

```ruby config/initializers/assets.rb
Rails.application.config.assets.precompile += %w( app1.js app2.js )
```

## Backend

If you want to turn certain features on and off for certain applications, you should use the [rollout gem](https://github.com/FetLife/rollout).  It is a great tool for enabling and disabling features on the fly, or just completely locking up certain parts of the application.

