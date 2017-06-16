---
layout: post
title: "Bulk email sending with Ruby"
date: 2015-09-03 17:44:17 -0700
comments: true
categories: 
---

<img src="/images/bike.jpg" alt="bike" title="Bulk email sending with Ruby" class="banner-img"  />

A friend of mine last week has a mailing list from 5+ years ago from an old niche website that he would like to market a new website too.  He asked for my advice on the cheapest and most effective solution for blasting out to this 100k user list.

I approached this problem with a few things in mind.  Mail providers don't trust emails from new domains and new email servers.  Mail servers, much like websites, have a reputation score.  If a mail server thinks you blasting too much unwanted email, then they assume you're a spam king and mark all emails sent from your address as spam.

So the key take away is don't let mail servers think you are spamming their users.  The best way to protect yourself getting a bad reputation is making sure you are sending to a legit email and you only send it once.

Since Mailgun's IP addresses are have a high reputation, we opted to use them instead of rolling our own POP server.  Plus they offer 10k emails sending for free.


In my script I validate an email 3 different ways before I determine if it is a legit email account.

```ruby
    def verify_domain(email)
      c = Whois::Client.new
      c.lookup(domain_from_email(email))
      c.registered?
    end

    def domain_from_email(email)
      split = email.split('@')
      domain = split[-1]
      dd = domain.split('.')
      dd[-2] + '.' + dd[-1]
    end
```

The first check is to see if the domain is even a valid domain name.  I use the gem `[whois](https://github.com/weppos/whois)` to verify the domain of the email is legit.  `domain_from_email` is just a hacky way of pulling out the domain from the email account. This would break if your email had a .co.uk domain, or anything with 2 dots in the tld, but most of the emails don't fall into that category.

So, now we know the domain is real, lets check the MX records to see if the domain even supports receiving emails.

```ruby
  def validate_email(email)
    ValidateEmail.valid?(email)
    ValidateEmail.mx_valid_with_fallback?(email)
  end
```
This is using the [valid_email gem](https://github.com/hallelujah/valid_email).

We could actually ask the mail server if the email address is legit, but that can be an unreliable source of information depending on how the machines are configured.

Since there could be duplicate email addresses in this list or in case I need to restart the process, I need to keep track of who I have emailed already.

```ruby
  def already_sent?(email)
    SentEmail.where(email: email).count > 0
  end
```
So I check to see if I think I have seen this email before.

```ruby
  @emails = load_emails

  @emails[0..50].each do |email|
    begin
      raise "verify domain failed" unless verify_domain(email)
      raise "email validate failed" unless validate_email(email)
      raise "already sent" if already_sent?(email)

      Inviter.invite(email).deliver
      SentEmail.create!(email:email)
    rescue StandardError(ex)
      FilteredEmail.create(email:email, reason:ex.message)
    end
  end
```

Wrapping it all together, we have a check each of our validation methods.  If any one of them fails, we throw an exception which makes note of it in the rescue method.

I limit the run to 50 emails initially just so I can keep an eye on my mailgun reputation.

Because mailgun limits the number of emails that can be processed per hour, I am not going to bother threading this, since this will process much faster than mailgun will let me.
