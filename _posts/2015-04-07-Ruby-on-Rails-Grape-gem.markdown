---
layout: post
title: "Ruby on Rails Grape gem: Pros and Cons"
date: 2015-04-07 01:36:51 -0700
comments: true
categories: 
---

<img src="/images/grapes.jpeg" alt="grapes" title="Ruby on Rails Grape gem" class="banner-img" />

Ruby on Rails is a very powerful framework that is awesome at building RESTful APIs.  Using vanilla rails to build an API, while completely possible, is not always the best way to go.  [Grape](https://github.com/intridea/grape) is micro-api framework design to work along side rails for developing an RESTful API.

Grape has some very [expansive documentation](https://github.com/intridea/grape/blob/master/README.md) describing how the gem works, so I am not going to dive too deeply into that

## Pros

Starting off with the positives: grape is great a creating and maintaining documentation.  I love the [grape-swagger](https://github.com/tim-vandecasteele/grape-swagger) gem allows you to easily generate documentation from you existing code base.  Since the documentation is generated, all of the code is self-documenting and you don't have to maintain [separate API documentation files](http://raml.org/).

Because grape has its own [DSL](https://en.wikipedia.org/wiki/Domain-specific_language), it makes creating APIs easy to read and understand.  This makes the code base easier to maintain for future improvements.  Plus it has its own opinion for how to create an API, which really help keep your codebase consistent.

grape gives you a uniform way to control API HTTP Headers.  Rather than having to roll your own classes to manage the response headers, grape makes it easy to set them.

## Cons

Because grape is independent of rails, it takes a bit of finagling for it to play well with rails.  You have to manually include rails libraries like ActiveRecord or ActiveSupport.  Since there is no ActiveSupport, it makes caching responses more difficult than it should be.

Because grape has its own DSL, there is a bit of a learning curve to understand how it wants you to create an API.  If you have a firm understanding of ruby, it shouldn't be that difficult for you to pick up, but it definitely takes a bit of getting used to.

While grape makes it easier to read and write your api, it does add another layer of complexity to your rails application.

## Conclusion

For now, I am going to stick with rolling my own APIs using "just"* the rails framework.  Being more pure rails, gives me more control over the api had has less "magic."  If I need to bring on a new developer, they will not have to spend as much time getting up to speed on this new library.

Plus, vanilla rails has an awesome caching tools that don't need to be arm wrestled into the framework.

* By "just" I mean, standard gem stack provided in rails 4.2 with typical basic additions I would use in both grape and vanilla rails.