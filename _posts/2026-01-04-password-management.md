---
layout: post
title: "How I Secure My Most Important Accounts"
date: 2026-01-0 01:49:55 -0400
comments: true
categories:
---
Below is a clean, structured rewrite suitable for a blog post. I’ve preserved your intent, simplified the narrative, and tightened the logic so it reads as practical guidance rather than a personal rant, while still grounding it in real experience.

---

When people talk about “account security,” they often jump straight to advanced tools, expensive subscriptions, or overly complex setups. In reality, the biggest risks to your personal accounts-especially financial ones, come from a few very predictable failure modes.

My goal is not perfect security. My goal is cheap, boring, resilient security that works even when things go wrong: providers make mistakes, phones get lost, or I cross borders and change SIM cards.

Here’s the simple system I use to protect my most sensitive accounts.

## 1. A Private Email Address I Fully Control

My most important accounts, banks, brokerages, crypto exchanges, tax portals, are all tied to a single, private email address that I never use anywhere else.

### Why this matters

There are two major risks with “normal” email usage:

1. Provider lockout
   If Google, Yahoo, or Microsoft decides (correctly or incorrectly) that your account violated a policy or triggered fraud detection, you can be locked out.
   Losing access to your email is annoying. Losing access to your financial accounts because your email is locked is catastrophic.

2. Targeted attacks after data leaks
   Data breaches are inevitable. When an email address appears in enough leaks, attackers can infer:

   > “This is probably the email used for important accounts.”

   I want attackers to not even *know* which email I use to authenticate money-related services, because they could leverage this in phishing emails.

### My solution

* I own a custom domain
* I use a single, plain email address on that domain (no dots, or +wildcards)
* That address is only used for financial and identity-critical services

Even though the email is currently hosted on Google, I can move it to another provider at any time without changing the email address itself. That means:

* I keep control
* I avoid provider lock-in
* I can recover quickly if something goes wrong

As a bonus, because this email is used so sparingly, if it ever shows up in a breach or spam list, I know exactly which service leaked it.

## 2. A Cross-Platform Password Manager (Not Platform Lock-In)

The second pillar is a proper password manager. I personally use [Bitwarden](https://bitwarden.com/).

### Why a password manager is non-negotiable

* Every account gets a unique, long password
* Passwords sync across:

  * Firefox and Chrome
  * macOS, Windows, iOS, Android
* I am not tied to a single ecosystem

I’ve watched friends switch phones or platforms and suddenly lose years of saved passwords because everything lived inside Apple Keychain or a browser profile. Recovering from that is painful and risky.

With a dedicated password manager:

* Switching devices is trivial
* Losing a device is annoying, but not life-ending
* Compromised passwords can be rotated quickly

Bitwarden also integrates breach monitoring, so I can see if any credentials associated with me appear in known leaks.

There are excellent paid options (like 1Password), but I deliberately keep my monthly subscriptions low. Bitwarden gives me what I need at zero cost.


## 3. Avoid SMS OTP Whenever Possible

Passwords alone are not enough. Two-factor authentication (2FA) is critical, but how you do it matters.

### Why I avoid SMS-based OTP

SMS authentication fails in the real world:

* Phone numbers change
* SIM cards get lost
* Messages don’t arrive while traveling
* Accounts often outlive phone numbers

Your bank account should not depend on whether you currently have reception in a foreign country.

### What I use instead

1. App-based authenticators whenever possible

   * Google Authenticator (or equivalent)
   * Works offline
   * Not tied to a phone number

2. Google Voice as a fallback

   * Used only when SMS OTP is unavoidable
   * Works internationally
   * Reliable ~95–99% of the time

In rare cases where neither option works, I fall back to my long-term U.S. phone number, but I treat that as a last resort because it’s expensive and fragile while traveling.

## 4. Designing for Loss and Failure (Because It Will Happen)

A core principle of my setup is assuming that bad things will eventually happen:

* A phone gets stolen
* A laptop disappears
* An email provider locks an account
* A service gets breached

The question is not *if*, but *how disruptive it is when it happens*.

This system minimizes blast radius:

* Losing a device does not expose passwords
* Losing a phone number does not lock me out
* Losing an email provider does not strand my accounts
* A single breach does not compromise everything

Security should reduce stress, not add to it.

## Final Thoughts

I didn’t arrive at this setup by reading blogs. I arrived at it through experience.

I’ve traveled to over 60 countries. In that time, I’ve seen a lot and I’ve had my share of things go wrong. I’ve been mugged twice. My phone has been stolen three times. Sometimes it was taken straight out of my pocket. Other times it was snatched directly from my hand.

What surprised me most wasn’t how fast it happened, I always knew within a few seconds that my phone was gone, but how inevitable it felt once it did. The people who do this are very good at it. Once the phone is in their hands, it’s gone. There’s no chasing it down, no heroic recovery story.

That reality fundamentally shapes how I think about security.

Losing a phone already sucks. Losing access to your money, your identity, or your accounts on top of that is far worse. I don’t want my financial life to be fragile—dependent on a single device, a single phone number, or a single company’s fraud system making the right decision at the right time.

Fortunately, despite all of that travel and all of those incidents, I’ve never had a serious account security issue. I’ve never had my finances compromised. I’ve never been locked out of critical accounts at the worst possible moment. And I’d like to keep it that way.

Good personal security isn’t about paranoia. It’s about designing your digital life so that when something goes wrong—and eventually, something will—it’s an inconvenience, not a disaster.
