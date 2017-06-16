---
layout: post
title: "Rails tip: Returning"
date: 2015-07-12 13:35:15 -0700
comments: true
categories: 
---

<img src="/images/house.jpg" alt="house" title="Rails tip: Returning" class="banner-img"  />

If you have been programming in Rails for pretty much any length of time, you will definitely run into a method that looks like this:

```ruby
def some_method
  foo = []
  foo << Cat.new
  foo << Dog.new
  return foo
end
```
You initiate some local variable, do some things to it, then return it.  

There is a lot of boiler plate code here and the smart developers behind rails added a method to the object class called returning.  This method simplifies this workflow.  Here is an example of the returning method in action.

```ruby
def some_method
  returning foo = [] do
    foo << Cat.new
    foo << Dog.new
  end
end
```

This is a much more elegant solution since it just reads more like a sentence than the previous example.  "Add Cat and Dog to foo then return" vs "create foo. Add Cat and Dog. return foo".  Ruby's ability to easily add DSL to objectss on the fly makes ruby so powerful and easy to maintian.
