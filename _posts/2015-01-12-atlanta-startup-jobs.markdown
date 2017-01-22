---
layout: post
title: "Atlanta Startup Jobs - Scratch your own itch"
date: 2015-01-12 19:52:21 -0600
comments: true
categories: 
---

<img src="/images/park.jpg"  alt="park" title="Atlanta Startup Jobs - Scratch your own itch" class="banner-img"  />

I have always wanted to start my own business, ever since I was in high school. Since then, I have been struggling to find an idea that I am truly passionate enough to invest my time or resources to execute on my own.

So I decided I graduated from Georgia Tech in ‘11, I decided I should do the second best thing: work for someone that is starting their own business. This is a great technique because it reduces your risk (get paid a /mostly/ competitive salary) and gives you an opportunity to learn (make mistakes on someone else’s dollar :-))

While Atlanta has an awesome startup culture unless you are familiar with the big players (co-working spaces, syndications, meetup groups), it can be difficult finding what companies are hiring. The Georgia Tech BuzzBoard only has postings by big name companies that can afford the hefty price tag. Same can be said about the popular job board sites like CareerBuilder.com or Monster.com.

Fast forward a few years and I finally figured out who to talk to and where to look for a startup job postings. But the experience was still frustrating because now I was checking 3-5 different job board websites for the various co-working and syndication websites.

There was no one place to find these jobs.

So I made [Atlanta Startup Jobs](http://www.atlantastartupjobs.com)

Atlanta Startup Jobs aggregates job postings from all of Atlanta’s job board websites automatically each night. Then every Friday, it emails out to the subscriber list all of the jobs it found over the last week.

The app is written in Ruby on Rails and hosted for free on Heroku. I use a separate application instance on Heroku (still free tier) to crawl the websites so the crawler gets its own set of dyno ours from the web application.

Since its launch 3 months ago, it has found over 350 job postings and gets on average 100 hits per day with a list of 60 subscribers.

If you are looking for a job in Atlanta’s startup community, Atlanta Startup Jobs is the place to start.