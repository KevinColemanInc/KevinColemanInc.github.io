---
layout: post
title: "How and when to add foreign key constraints"
date: 2019-03-14 01:49:55 -0400
comments: true
categories: 
---

<img src="/images/hand-connections.jpg" alt="Hands connected in a group" title="Hands connected in a group" class="banner-img" />

Many rails projects rely on application validation to ensure data integrity. With rails `presence` validation, you can require associations exist in order for an object to be saved. This works until it doesn't.

## Not having foreign key constraints

If a developer forgets to define a dependency option on a rails validation (e.g. `has_many :users, dependent: :nullify`), uses `#delete` instead of `#destroy`, or even manually deletes it via a query, and the associated rows will point to empty records. This isn't ideal, because now you can't reliably test if an association exist by seeing if the id exists.

```ruby
# good
puts "company exists!" if user.company_id

# bad - N+1 to load the company
puts "company exists!" if user.company.id
```

If the company is deleted, but the users are not deleted with the company, you might be accidentally invalidating your models, thus preventing you from saving any attribute changes!

```ruby
class User < ApplicationRecord
  belongs_to :company, required: true
end
user.company.delete
user.update name: 'kevin' # false - company is missing
```

wat. I can't save the name if the company isn't there?

## Adding foreign key constraints

In Rails 5, adding foreign key constraints was added to have the database protect the integrity of associated data. Once a foreign key constraint is defined, your database will not allow you to remove records that are required by other tables.

```ruby
add_foreign_key :users, :companies
```

<img src="/images/yeet_dba-logo.png" alt="logo of the yeet_dba gem" title="logo of the yeet_dba gem" />

A quick way to add foreign key constraints to your entire rails schema is to use the [yeet_dba](https://github.com/kevincolemaninc/yeet_dba) gem. `yeet_dba` includes rake tasks and generators that scan your entire database searching for columns missing foreign key constraints. If the data is valid, it can add the foreign key constraint speeding up your joins and where queries or if the data is invalid, it will help you resolve the problem.

By adding foreign key constraints to your database you reduce N+1 calls, improve join and where query performance, and prevent unexpected failures with missing associations.

### Further reading

- [lol_dba](https://github.com/plentz/lol_dba) - This gem helps find indexes that are missing, but not foreign keys.
- [Postgres foreign key guide](http://www.postgresqltutorial.com/postgresql-foreign-key/)
- [Rails foreign key constraints](https://www.kcoleman.me/2019/03/14/how-to-add-foreign-key-constraints-rails.html)
