---
layout: post
title: "Saigon Safe: Personalizing open-source for fun and profit"
date: 2026-06-14 01:49:55 -0400
comments: true
categories:
---
I've used Bitwarden for ~6 years, and there were a handful of UX issues that annoyed me enough that I finally did something about them.

The result is **Saigon Safe** [Firefox](https://addons.mozilla.org/en-GB/firefox/addon/saigon-safe/): a fork of the Bitwarden browser extension, built mostly with AI-assisted coding.

<p align="center">
  <img src="/images/saigon-safe.png" title="Screenshot of Saigon Safe login" width="50%" />
</p>

A few features added:

## **One-click account creation**

<img src="/images/saigon-safe-default-email.png" title="Autofill registration forms and auto-save"/>

* Set a default email address
* Generate a strong password
* Auto-fill the registration form
* Automatically save the credential

No more:

* Copy password
* Paste password
* Re-enter email
* Hope Bitwarden notices the new account

## **Touch ID unlock**

Unlock your vault using your laptop's biometric authentication instead of typing a long master password every time.

## **UX improvements**

* Bottom menu bar moved to top, for faster mouse access
* If you try to auto-fill and Saigon Safe is logged out, prompt for password (instead of silently failing like today...)
* Auto-fill cycles through current login items.

## **Hidden accounts**

<img src="/images/saigon-safe-pin.png" title="Search pin screenshot for Saigon Safe"/>

* Inspired by [Zalo's hidden conversations](https://www.vietnam.vn/en/cach-an-cuoc-tro-chuyen-zalo-trong-mot-not-nhac).
* Mark sensitive accounts (banks, investments, email providers, etc.) as hidden.
* They won't appear in search results unless you enter a separate secret PIN.

This adds a layer of privacy if someone gains access to an unlocked device or vault. This feature is only enforced on the client level. The export feature will still reveal the hidden accounts.

## **Less marketing clutter**

Removed upsell and promotional UI from the extension.

The extension still uses Bitwarden's backend and infrastructure. Your vault, sync, and encryption work exactly as before—this is purely a client-side experience improvement.

[Firefox](https://addons.mozilla.org/en-GB/firefox/addon/saigon-safe/) is available now. Chrome is in testing and should be released in the next few weeks.

If there's enough interest, I'll look at bringing these improvements to the iOS and Android apps as well.

The source code is open source [github.com/KevinColemanInc/saigon-safe](https://github.com/KevinColemanInc/saigon-safe). If you'd like to review the changes, check out the GitHub repo below.

Amazing what becomes possible when AI reduces the cost of understanding and modifying large codebases.

Commercial modules were removed to avoid violations of Bitwarden's copyright file. Feel free to contact me at kevin@sparkstart.io if you have any questions.
