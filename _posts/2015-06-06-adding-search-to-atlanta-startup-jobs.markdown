---
layout: post
title: "Adding search to Atlanta Startup Jobs"
date: 2015-06-06 08:23:14 -0400
comments: true
categories: 
---

<img src="/images/czech_1.jpg" alt="czech" title="Adding search to Atlanta Startup Jobs" class="banner-img"/>

I found a few minutes today to finally add search to [Atlanta Startup Jobs](http://atlantastartupjobs.com).  I had been putting it off for a long time, thinking it would be a long laborous process, but I found it was shockingly easy.  Here is what I did:

## Install pg_search
The two leading gems that drive postgress fulltext search are [pg_search](https://github.com/Casecommons/pg_search) and [textacular](https://github.com/textacular/textacular).  I went with pg_search, because it has more love on github.

```ruby Gemfile
  gem 'pg_search'
```

and run bundle

```console console
  bundle
```

## Modify model

For the models you want to search, add `include PgSearch` to the top of them in order to enable the pg_search DSL.  Since [Atlanta Startup Jobs](http://atlantastartupjobs.com) only has one searchable model (job_posts), I include this line in the model:

```ruby Gemfile
  pg_search_scope :search_generic, :against => [:title, :company_name, :description], :order_within_rank => "created_at DESC"
```

I included the "order_within_rank", to protect the order across different pages, since postgres randomly ranks items with equivalent rank score.

## Modify controller

Here is what my search action looks like in my controller code:

```ruby job_posts_controller
def search
  @job_posts = JobPost.search_generic(params[:q]).page params[:page]
  render :index
end
```
