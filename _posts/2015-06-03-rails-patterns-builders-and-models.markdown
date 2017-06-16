---
layout: post
title: "Rails Patterns: Builders and Models"
date: 2015-06-03 09:23:38 +0200
comments: true
categories: rails, ruby
---
<img src="/images/sf-bridge.jpg" alt="bridge" title="Rails Patterns: Builders and Models" class="banner-img"/>

A huge problem with ruby on rails apps is many of them end with overly cluttered models and controller methods. An attempt to solve this would be to move what you can to your active record models, but then you end up with heavily bloated model classes that extend way beyond their intended active record design patterns.  Active record models should just manage the communication between the rails app and the database.  Anything else is just code smell.

In all of my experience with rails projects, I found that my active record models typically ended up having a group of methods that helped me create the model itself (think when you create a user, you also need to create a user_profile or if you want to find or create a model).


# Builders 
You can easily break this type of code away from the model by following a builder pattern. Builder patterns are great for creating objects with business logic based on given parameters.  It adds an easy way to add business logic to model creation without adding bloat to your active record model class.

To follow this pattern, create a directory called `builders` in the `/models` directory.

Here is an example of my user class before and after a refactor with the builder pattern.

before:

```ruby user.rb
  def self.create_admin_user email, password
    user = User.find_or_create_by email: email, password: password
    user.add_role :admin
  end

  def self.create_staff_user email, password
    user = User.find_or_create_by email: email, password: password
    user.add_role :staff
  end

  def self.create_user_with_invite email, password
    user = User.find_or_create_by email: email, password: password
    user.send_invitation
  end
```

after:

```ruby user.rb
  # nothing to see here
```

```ruby /builders/user_builder.rb
  class Builders::UserBuilder
    def self.create_admin_user email, password
      user = User.find_or_create_by email: email, password: password
      user.add_role :admin
    end

    def self.create_staff_user email, password
      user = User.find_or_create_by email: email, password: password
      user.add_role :staff
    end

    def self.create_user_with_invite email, password
      user = User.find_or_create_by email: email, password: password
      user.send_invitation
    end
  end
```

# Non-AR models
Models also can get bloated with controller-like actions that have groups of methods that should be broken out into their own classes that the controllers will leverage.  An example of this type of class would be one that manages to send an email to a user.  These models don't extend active record, because they focus is performing business logic on active_record models, not storing them in the database.  Models take in a limited scope of the Params of a request, perform their function, and then return their results to the controller. 

Before breaking out email sending, active record models would end up with a collection of email sending methods (send_password_reset, send_notification, etc). All of these should be moved to a model classes because classes have one purpose and active record models are for Savin data, not sending emails.

An example of this could be:

```ruby user_invitor.rb
  class UserInvitor
    def invite_email email
      Invitation.create email: email
      UserMailer.invite_email(email).deliver_later
    end
  end
```