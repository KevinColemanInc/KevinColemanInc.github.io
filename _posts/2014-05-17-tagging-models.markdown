---
layout: post
title: "Tagging Models"
date: 2014-05-17 11:14:24 -0400
comments: true
categories: 
---
<img src="/images/music_slider.jpg" title="Tagging Models" alt="Music Slider" class="banner-img"/>

Sometimes you need to tag your models with tokens, think tagging images with keywords or including hashtags in a twitter post.

And in a slightly more rare situation, you sometimes may want to have multiple types of tags for your products.  Like in an ecommerce store, you may want to have a style, color, type, or generic tags attached to your product model.  These tags could be used in an recommendation engine to help determine what products are similar to other products.

# Create the Style Model
This is your basic many to many relationship between your style model and your products model.

```ruby db/migrations/create_styles_table.rb

    create_table :styles do |t|
      t.string :name, null: false
      t.timestamps
    end

    create_table :products_styles, id: false do |t|
      t.integer :product_id, null: false
      t.integer :style_id, null: false
    end
```

# Creating the tags concern
Because effectively all of the tags are going to have the same attributes (namely `:name`), I want to have all of that common code in a Concern that will be included in all of the different types of tags

My concern looks like this

```ruby app/models/concerns/taggable.rb
module Taggable
  extend ActiveSupport::Concern
 
  included do
    validate :name, presence: true

    has_and_belongs_to_many :products
    before_save :downcase_name
  end

  def downcase_name
    name.downcase!
  end
end
```

I want to only save the lower case name and I want to automatically report the relationship between products and the taggable attribute.  This will reduce the noise in the database.

# Create the Model
Now because I am using a concern, my models should be really thin and only look like this

```ruby app/models/concerns/taggable.rb
class Style < ActiveRecord::Base
  include Taggable
end
```

# Adding and removing tags
Using the jQuery tokenizer extension, you can follow the guide at [Rails casts](http://railscasts.com/episodes/258-token-fields) to hook into your model.  While his approach is dandy and all, we have multiple types of tags attached to our product and there is a faster way to manage the addition methods on our model.

His method requires that you have a method like below for every one of your token attributes.  This is going to make your products model huge as you add more and more taggable attributes.

```ruby app/models/concerns/taggable.rb
  has_and_belongs_to_many :authors

  def author_tokens=(ids)
    self.author_ids = ids.split(",")
  end
```

We can reduce this code creep by using Ruby meta programming.  I want to have an array of all of the taggable attributes that product can have and it should automatically create the necessarily methods and relationships between products and this taggable item.

```ruby app/models/product.rb
  ATTRIBUTES = %w(style)

  ATTRIBUTES.each do |status_name|
    has_and_belongs_to_many status_name.pluralize.to_sym

    define_method "#{status_name}_ids=" do |ids|
      self.send (status_name.pluralize + "="), ids.split(',').map {|c| status_name.pluralize.singularize.camelize.constantize.find(c.to_i) }
    end 

  end
```

Now as add more and more taggable items to the product model, it will automatically create the `[attribute_name]_ids` methods that the jQuery needs to attach these tokens onto our model.  The more taggable attributes I add, the more code I save.

# Alternative approach
You could argue that I could of put all of the tags in one table and used STI to break each type into different models.  While this could work if all of the tags had the same name type of string, you may want your name attribute to be an integer.  Having them in separate tables will also reduce the table size, thus making the results run a little bit quicker.

# Conclusion
Like always, feel free to hit me up in the [chat](/chat).  My chat tool is hooked into Google Talk, free too drop me a message if you have any questions.  Cheers.
