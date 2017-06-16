---
layout: post
title: "Rails tips: Fast Relation Detection"
date: 2015-07-10 08:15:04 -0700
comments: true
categories: 
---

<img src="/images/cafe.jpg" alt="cafe" title="Rails tips: Fast Relation Detection" class="banner-img"  />

When working with active_record, you often need to establish if a row exists to see if you can do operations against it.  Here is an interesting technique when checking if objects or relations exist in a collection.


Many developers use the `present?` method, but this is bad practice, because it performs a standard `SELECT` query against your table which, relative to a count, is very slow.

```ruby

blog.posts.present?
# SELECT id FROM `posts` WHERE ("posts".blog_id = 1)

```

The better trick would be to use the `exits?` method to more efficiently determine if a record exists since it just has to return a number instead of a large collection of objects

```ruby
blog.posts.exists?
# SELECT id FROM `posts` WHERE ("posts".blog_id = 1) LIMIT 1
```

Alternatively, if you know you are going to need the object later, it is better to just load exactly what you need and use it later:

```ruby
if blog.posts.length > 0
# SELECT id FROM `posts` WHERE ("posts".blog_id = 1)
  do_something_with_posts(blog.posts)
  # No query
end
```

If you had done a exists or a count on the post, then you would have to run back to the database to fetch the rest of the objects.  While this is more memory intensive, it can be much faster technique.
