---
layout: post
title: "Custom Environments with Rails 4"
date: 2014-05-15 10:41:53 -0400
comments: true
categories: 
---

Sometimes you may need to setup custom environments beyond the standard `test`, `development`, and `production` that rails comes with.  If you would like to have your staging server configured a little big differently than test and production (maybe higher logging levels for example), then you would need to create another environment for these configurations called `staging`.

## Changes, Additions and Edits
### Gemfile
In your `Gemfile`, you should add your new environment to the necessary groups.  If your environment is similar to `production`, you should add `staging` next to everywhere you see the `production` group lie below.

```ruby
group :development, :staging do
  gem 'log4r'
end
``` 
### Update config/database.yml
You should create a new environment in your database.yml file.  This will look something like this

```yml
default: &default
  adapter: postgresql
  pool: 5

staging:
  <<: *default
  database: w2w-staging
```

### Environment Config
In `config/environments/`, you should add `staging.rb`.  To make things easy, copy an existing environment that is most similar to the new one you are creating and make the adjustments you need from there.

### Update Secrets.yml
If you are running rails 4.1, you will also need to update your `secrets.yml` file to handle new the new environment

```yml
staging:
  <<: *default
  secret_key_base: secrets_are_secretive_SALFJASFLKSAJFLSAFJOWERULSADFJLKSAFJD

```

### Misc
Do a quick find on your project directory for any environment specific code being run.  Look for things like `Rails.env.` and add your new environment to these conditionals like below

```ruby
if Rails.env.test? || Rails.env.development? || Rails.env.staging?
```
