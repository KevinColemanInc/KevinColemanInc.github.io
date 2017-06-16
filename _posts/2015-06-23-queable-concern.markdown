---
layout: post
title: "Adding Queues to your models"
date: 2015-06-23 21:54:42 -0700
comments: true
categories: 
---
<img src="/images/bird_statue.jpg" alt="bird statue" title="Adding Queues to your models" class="banner-img" />

At work recently, we needed to introduce the concept of a queue into our rails app.  MySQL really doesn't do a great job with these types of things, because it is so slow.  Redis is a much better solution, because its speed and ease of use.

I built the queueing concern on top of RedisObjects, because it has such a great DSL wrapper for storing ruby types into redis.  The main feature I use is their list object.

```ruby queueable.rb
module Queueable
  extend ActiveSupport::Concern

  included do
    include Redis::Objects
  end

  # more code here

end

```
This adds Redis::Objects to the models that I use this concern on so I can leverage their list DSL method.

In my model, I want to write my own DSL to make it super easy for me to create new queue attributes in all of my models.  I want to be able to just do this in my model:

```ruby user.rb
class User < ActiveRecord::Base
  include Queueable

  queue :scoring_queue
  queue :email_queue

end
```

For the purposes of my application, I needed to be able to:

* rotate the queue, such that the top element returned and is moved to the bottom of the queue.
* set the entire queue to something new.
* re-queue a element, so that if it exists in my queue, it gets sent to the bottom.


```ruby user_controller.rb
class UserController < ActiveController::Base
  def show
    user = User.find(params[:id])
    next_score = user.rotate_scoring_queue #gets the top element and moves it to the bottom
    user.requeue_scoring_queue invited_score # moves this score to the bottom of the queue
  end
end
```

To accomplish this, I use a meta programming to dynamically create these methods.  The `define_method` in ruby is an extremely powerful concept that allows developers to create methods based with dynamic names.


```ruby queueable.rb
  class_methods do
    def queue(queue_name)
      list queue_name

      define_method("rotate_#{queue_name}") do
        queue_list = send(queue_name)
        queue_list.rpoplpush queue_list
      end

      define_method("#{queue_name}=") do |vals|
        queue_list = send(queue_name)
        Redis::Objects.redis.multi do
          queue_list.clear
          queue_list.push *vals.reverse if vals.length > 0
        end
      end

      define_method("requeue_#{queue_name}") do |target|
        queue_list = send(queue_name)
        number_removed = queue_list.delete target
        return if number_removed == 0
        
        last_item_in_queue = queue_list.first

        if last_item_in_queue
          queue_list.insert :before, last_item_in_queue, target
        else
          queue_list.push target
        end
      end
```

The first line `def queue` adds in my DSL method to the model to allow queues with a given name to be created.

Unfortunately RedisObjects doesn't come with an out of the box way to set an entire list at once.  So I had to write my own using Redis transactions.  So the second method overrides the setter method of the list to accept an array of values that we will set.

The re-queue method removes a target value from the queue.  Then it sets it to the queue, if it can't find a last item (then that means it was the only item in the queue), it adds it back to the list.

