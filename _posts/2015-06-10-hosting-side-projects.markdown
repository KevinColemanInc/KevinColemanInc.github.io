---
layout: post
title: "Hosting Side Projects for Free"
date: 2015-06-10 19:33:59 -0700
comments: true
categories: 
---

<img src="/images/czech_2.jpg" alt="czech" title="Hosting Side Projects for Free" class="banner-img img-responsive"/>

With [Heroku's latest pricing restructure announcement](https://blog.heroku.com/archives/2015/5/7/new-dyno-types-public-beta), I decided it was time to re-evaluate my [side-project](/projects) hosting strategies.  Historically, [Heroku](http://heroku.com) has been my go to as a hosting provider for my various rails application endeavors, because it is so easy to setup and, most importantly, free.

Previously my strategy for free hosting on Heroku without any server sleeping was to configure [new relic](http://newrelic.com) to measure server uptime.  This was a great trick to keep your Heroku server from sleeping and it let you keep an eye out for server down time.  I shall be sad to see that go :(.

My new recipe for creating new side project deployments is as follows:

# Buying a domain for free
With the new [influx of TLD extensions](http://www.newtldlist.com/), many registrars are heavily discounting these new extensions in order to encourage main stream adoption.  You can snag a new domain name for dirt cheap, and often free, using one of these new domain extensions.

If you are still a student or still have a .edu email address (thanks, [Georgia Tech](http://gatech.edu)!), you can register a .me domain for free and/or a heavily discounted .com or .io domain using [Github.com's education pack](https://education.github.com/pack).

Checkout [register.science](http://register.science), [register.party](http://register.party), and get on the [Alpnames mailing list](http://www.alpnames.com/) to be notified of when free domain names are available for registration.

# Hosting

## Heroku (free-ish)
You can stick with Heroku dyno's but like I said before, they are no longer allow websites to be active 24 per day.  Heroku will still be my go to for scheduled rake tasks, or anything that doesn't need to be awake all day since it is so easy to deploy to.  

Heroku also has great free database hosting for side projects.  As long as your db doesn't exceed 10,000 rows, Heroku will host it for free and give you a nice interface to run queries on.

## Apigee (free)
[Apigee Edge](https://apigee.com/docs/api-services/content/what-apigee-edge) promises a lot of really [nice features](https://apigee.com/about/pricing/apigee-edge-pricing-features) for their developer accounts: a buttload of storage space, unlimited bandwidth, and api analytics.  The big gotcha's though are they only host nodejs applications and their documentation is terrible.  ~~Once~~ if you can figure out how to get your website running, it is pretty simple to maintain, but getting it up there may take hours.  I used them for the [Sears Hackathon](http://challengepost.com/software/sentimus-edegx) and the struggle was real.

You can also do some pretty sweet stuff with combining api's into new apis.  They also have a service that competes with Parse for managing mobile app data, but again, the documentation is terrible.  Good luck.

## Github pages (free)
I host this blog on [Github pages](http://pages.github.com) and build things with [Octopress](http://octopress.org/).  Deployments and settings things up are a breeze, but github only hosts static content.  

A small part of me is considering moving [AtlantaStartupJobs.com](http://AtlantaStartupJobs.com) to github, because the content there only changes once per day.  I would just need to write ruby tasks to grab the latest Atlanta start up jobs, generate the html for them, and then push up to Github.

Since it is static, there is not backend database other than static hosting .json files, which could be a thing...

## Amazon Web Services (free-ish)
For one year, you can utilize the basics of [AWS](http://aws.amazon.com) for free.  One big catch here is setting up AWS servers and configuring them can be a weekend project on its own, unless you are familiar with devops.  It is not where near as simple as Heroku and you are limited by the resources of one ec2 machine.  It doesn't scale well if you plan on hosting a bunch of different projects.

AWS has [RDS](https://aws.amazon.com/rds/) which makes it super easy to throw up a database.  They support [mysql](https://www.mysql.com/), [postgres](http://www.postgresql.org/), and a few others.

## OpenShift (use this one!)
[OpenShift](http://openshift.com) seems like the best drop in replacement for Heroku.  They have a free tier with reasonably powerful servers.  Unfortunately the database shares the same limited resources the application server utilizes, so you get a bit less than 1GB of storage space for your application and database to share.

My strategy here is to keep my Heroku database up and just configure my OpenShift application to connect directly to the Heroku one, so I don't have to deal with shared resources.  This may make my website a little bit slower, but it should be good enough.

## Cloud99
I have heard bad stories about [Cloud99](http://www.cloud66.com/) and they were [hacked a few years ago](https://news.ycombinator.com/item?id=5685406), plus they are not free.  My advice is to stay away.

# Free email
Having an @gmail.com account as the linked support email for your side project is so not classy.  You can configure your free custom domain with [Zoho](http://zoho.com) and be able to email your customers from a more legit looking domain.  Be sure to configure your MX records properly so your new domain doesn't get sent to the spam folder.

# Free transactional email sending
I really like [Mailchimp's Mandrill](http://mandrill.com).  I have been using them for years and haven't had any problems.  They offer a generous number of emails sent (10k) to be exact and don't limit their services in features, just mailing volume.

# Free SSL certs
Another sweet trick you can do for your side project websites is to use [Cloudflare](http://cloudflare.com) to deliver valid SSL certificates for your projects.  From an SEO perspective, google loves SSL and from a safety and privacy perspective users love SSL.  You can read up on how to do with [here](https://www.benburwell.com/posts/configuring-cloudflare-universal-ssl/).  

It took me 15 minutes to configure [kcoleman.me](/) and [AtlantaStartupJobs.com](http://AtlantaStartupJobs.com) to be behind Cloudflare.
