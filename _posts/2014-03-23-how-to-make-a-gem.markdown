---
layout: post
title: "Extending Active Record in Rails 4.1"
date: 2014-03-23 23:40:48 -0400
comments: true
categories: 
---
A great way to extend rails functionality is by using Rails gems.  These libraries are easily plugged into existing ruby projects and allow for quick integration of complicated features.

I noticed that for my side projects that are still growing, that I would like to be notified whenever a new user signs up, so I can reach out to them to get feedback on the product.

Here I will go through step by step on how I created [Angora](https://github.com/KevinColemanInc/Angora), email notifications on model creation

# The art of naming

Firstly, select a name.  This name should be unique to other gems so other developers can easily find it.  Check [Github](http://github.com) and [RubyGems](http://rubygems.org) to verify that there aren't any other gems with the same name.

RubyGems provides a excellent [table](http://guides.rubygems.org/name-your-gem/) for describing how to name a gem.

# Creating the gem

We are going to use the bundler tool to generate the gem files.  Since my gem name is angora, I type this in:

``` console Creating gem with bundler
  $ bundle gem angora
    create  angora/Gemfile
    create  angora/Rakefile
    create  angora/LICENSE.txt
    create  angora/README.md
    create  angora/.gitignore
    create  angora/angora.gemspec
    create  angora/lib/angora.rb
    create  angora/lib/angora/version.rb
```
# Upload to github

Lets add this project to github and start tracking it with git.  This will also give us a homepage to link to, which we will get to next.

``` console
  $ git init
  $ git add -all
  $ git commit -m "first commit!"
  $ git remote add origin <git url>
  $ git push origin master
```

# The basics

Now we are going to edit the basic attributes of angora.  Open up `angora.gemspec` to see all of the generated defaults.  Change all of the attributes to what is relevant for your project.


``` ruby angora.gemspec
  spec.authors       = ["Kevin Coleman"]
  spec.email         = ["kevin.coleman@gatech.edu"]
  spec.summary       = %q{TODO: Get notifications when a new object is created.}
  spec.description   = %q{TODO: Angora hooks into ActiveMailer to send off an email notification with all of the
  spec.homepage      = "https://github.com/KevinColemanInc/angora"
```

# Dependencies

Because this gem depends on active record, I need to add that as a dependency to the gem.  We will also be using rspec to test the gem.

``` ruby angora.gemspec
  spec.add_dependency "activerecord"
  spec.add_development_dependency "rspec"
  spec.add_development_dependency "sqlite3"
```

and I need to require it in the gem file, so it loads with the gem.

``` ruby lib/angora.rb
  require "active_record"
```

# First Test

Following TDD practices, we must first write our tests before we start writing feature code.  I am going to use rspec.

``` ruby spec/lib/angora_spec.rb linenos:true
  require 'spec_helper'

  describe "angora_spec" do
    context "send notification" do
      it "should send a notification message" do
        User.create(name: "Kevin")
      end
    end
  end
```

This will verify that a notification has been sent when the user is created.  For this test to run, we will need to create the `spec_helper.rb` file.

``` ruby spec/lib/angora_spec.rb linenos:true
  require 'angora'

  ActiveRecord::Base.establish_connection(:adapter => "sqlite3", 
                                       :database => File.dirname(__FILE__) + "/angora.sqlite3")

  load File.dirname(__FILE__) + '/support/schema.rb'
  load File.dirname(__FILE__) + '/support/models.rb'

```
`require 'angora'` will add references to our gem and active_record that our tests will need to run.  We will need a database to test our gem against, so I am establishing a connection to a local sqlite3 database.

After the database is loaded, we will need to load up a schema file so rails can use that schema.

```ruby spec/support/schema.rb
  ActiveRecord::Schema.define do
    self.verbose = false

    create_table :users, :force => true do |t|
      t.string :name
      t.timestamps
    end
  end
```

Create the schema file like above.  Because this is just for testing, I am only creating one model and only giving it one attribute, name.

We will also have to create the user model class.

```ruby spec/support/schema.rb
  class Post < ActiveRecord::Base

  end
```

