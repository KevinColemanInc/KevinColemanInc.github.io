---
layout: post
title: "Rails 4.1 enums: How not to handle states"
date: 2014-06-05 13:08:29 -0400
comments: true
categories: 
---

<img src="/images/road.jpg" alt="road" title="Rails 4.1 enums: How not to handle stats" class="banner-img"/>

I subscribe to the [Ruby Weekly](http://rubyweekly.com/) news blog, so I can stay updated with the latest rails practices and gems.  90% of the time, there is some really good information in there.  But occasionally, sometime catches my eye that just feels wrong.

In this weeks email, there was a post linking to [An introduction to Rails 4.1's Enum](https://www.youtube.com/watch?v=UbOkNduhCfw) where he talks about how you should use enums to handle your model states.

_This upset me._  

You really shouldn't be using enums for variables that don't have a strong numerical meaning (like in the example below), because it obscures the meaning of the variable's value.

## What are Enums

For those that don't know what enums are, they essentially allow you to give names to integers.  This is really cool, because I can do things like:

```ruby
  enum http_code: { continue: 100, ok: 200, accepted: 202, redirection_perm: 301 }

```
Now I can have named response codes to http codes.   I can do things like ` response.http_code == :ok ` to see if the response was valid.  Now I wont have to remember all of those http numbers, I can just remember the names of them.

That is what enums are good for.  State is what enums are bad for. Unfortunately the [example code](https://github.com/codemy/blogmenow/pull/3/files) for using them in rails suggests that you use them for state.

## Why enums are bad

Yeah, its great to have name attributes for numbers, but this gets bad when you start putting them in the database and the numbers don't really mean much by themselves, which is how you would look at them if you were to hit the database directly with a query.

### Only exist inside of the application

So if my states are like so with the order being pending => processing => accepted => complete

```ruby
  enum state: { pending: 1, processing: 2, accepted: 3, complete: 4 }
```

I will only see numbers in the database.  If I do an export of the db to hand to my data analyst, he is going to have no idea what those numbers mean.  Now I have to include my db dump and my .rb file with the enums spelled out.

Or perhaps, you have a [nodejs](http://nodejs.org/) application powering your chat service that also accesses the same db.  In the nodejs world, you would have to maintain a similar enum list so it can read from the states.  Your nodejs developer would have to reference your .rb file to determine what number really means what.

### Growth causes confusion

This will also get confusing as your application grows you may want to add more states. You may end up with something like this:

```ruby
  enum state: { pending: 1, processing: 2, accepted: 3, complete: 4, shipping: 5 }
```

The new order would be pending => processing => accepted => shipping => complete.  Which is awkward, because in the database, it looks like 1 => 2 => 3 => 5 => 4.  Which can feel a bit weird if you don't know what is going on.

If you had just left your states as named strings, you wouldn't have this odd ordering issue or this ambiguity of what number resides with what state.

