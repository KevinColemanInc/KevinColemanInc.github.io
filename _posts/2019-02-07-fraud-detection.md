---
layout: post
title: "Fraud Detection with Ruby on Rails"
date: 2019-02-07 01:49:55 -0400
comments: true
categories: 
---

<img src="/images/scammer.jpg" alt="Man in a mask" title="Man in a mask" class="banner-img" />

If you're a scammer, please don't read this. Everyone else keeps going. :)

I created the AvoVietnam mobile app [to connect Vietnamese with foreigns](https://www.avovietnam.com). I have had an influx of registrations of scammers trying to defraud my female Vietnamese users. [Their basic strategy](https://vietnamnews.vn/society/372275/scams-break-womens-hearts-bank-accounts.html) is get a girl to trust them with promises of love and marriage. They tell their victim they want to protect and take care of them. The scammer will offer to send them some money to buy a safe car or even a house, but of course, there is a transfer fee the girl must pay.

Most of these scammers are located in North and West Africa. They would upload attractive photos of western men with jobs like airline pilot or military captain and a cute puppy, but their GPS and IP address would say they lived in a shack in Nigeria.

<img src="/images/fake-profile.png" alt="Fake profile on AvoVietnam" title="Fake profile on AvoVietnam" class="banner-img" />

I am going to go over a few of my techniques for stopping low-tech scammers from reaching my users.

## Shadow banning

When a user has been marked as a scammer, rather than kicking them off the platform and signaling that they have been caught, I would shadow ban their account. When you are shadow banned, your profile and messages are hidden from all of the other users and your account can only see a static list of fake profiles. The scammer will think everyone is ignoring them and maybe there are not many active users on the app.

Stopping these scammers is like playing whack-a-mole. I want to slow them down as much as possible

## App store location

Both Apple and Google have different stores for each country in order to abide by the various regulations and laws. Most of my scammers seem to be coming from North and West Africa. By removing my app from being listed in basically all of Africa (I left South Africa on my list), they will need an account configured to different store to even download my app.

## IP address location

When an account accesses the API, I save the IP address to a separate table and fire off 2 [Sidekiq workers](https://github.com/mperham/sidekiq) to collect information about the IP address.  The first worker looks up the country of the IP Address. Using the [countries gem](https://github.com/hexorx/countries), I can easily identify which countries belong to Africa and shadow ban them.

I do not use a geocoder gem, because I want to keep my ruby on rails application as small as possible. You can easily call the [ip stack](https://ipstack.com) API with a `Net::HTTP` request.

```geocode_ip_worker.rb
class GeocodeIpWorker < ApplicationJob
  def perform(id)
    ip_address = IpAddress.find(id)
    return if ip_address.proxy || ip_address.country.present?
    resp = reverse_ip(ip_address.ip_address)
    ip_address.country = resp['country_name']
    ip_address.city = resp['city']
    ip_address.country_code = resp['country_code']
    ip_address.save!
  end

  def reverse_ip(ip)
    uri = URI.parse("http://api.ipstack.com/#{ip}?access_key=xxxx")
    response = Net::HTTP.get_response(uri)
    return nil if response.code != '200'
    JSON.parse(response.body)
  end
end
```

After a few weeks, I noticed the scammers started using USA-based proxy addresses to fake their locations, thus avoiding my automatic detection. Unfortunately, for them, there are many free services that will tell you if the person is using a proxy to access your service. I push that to a sidekiq worker as well. If the user is trying to hide their location, bye-bye. Again, no new gems needed.

```check_for_proxy_job.rb
class CheckForProxyJob < ApplicationJob
  def perform(id)
    ip_address = IpAddress.find(id)
    return if ip_address.proxy.nil?
    ip_address.proxy = proxy_test(ip_address.ip_address)
    ip_address.profile.update shadow_banned_reason: :proxy if ip_address.proxy
    ip_address.save!
  end

  def proxy_test(ip)
    uri = URI.parse("http://v2.api.iphub.info/ip/#{ip}")

    req = Net::HTTP::Get.new(uri)
    req['X-Key'] = "..."

    response = Net::HTTP.start(uri.hostname, uri.port) {|http|
      http.request(req)
    }

    return nil if response.code != '200'
    JSON.parse(response.body)&.dig(:block) != 0
  end
end
```

## GPS location

Since my [dating app for Vietnamese girls and foreigners](https://www.avovietnam.com) is a mobile app, I have sometimes had access to the phone's GPS location. I don't require it to use the app, but I do ask for it for fraud detection and better location detection. Most people, including the scammers, are comfortable sharing their GPS location with a dating app. On Android, it is easy to fake your GPS location by using "Developer mode." But if you do reveal your location and you are in an African country, you will automatically be shadow banned.

Using a lat-long to country API to look up their location was super simple to run in a sidekiq worker. I won't include the code for that here, but it looks very similar to the previous workers.

## Banning WhatsApp numbers

The scammers would always try to move the conversation off of the platform to prevent administrators from seeing their malicious activity. When a profile is shadow banned, I scan through every message they have ever sent to find any WhatsApp or Zalo phone number that they might be used to message the girls.

If I see a user sharing a banned number with another user, I automatically shadow ban their account. Once caught, they would need to create a completely new WhatsApp account.

## Banning the device

To prevent the scammers from re-registering the app with an undetectable proxy, I generate a UUID and store it onto the filesystem of the device. When a user tries to register twice, I will receive the same device UUID as the first registration. They would need to delete the app's memory or re-install the application to get a new device ID. Apple and Google used to give you access to the device's MAC address, which is impossible to change, but due to recent privacy concerns, they no longer consistently give access to that API.

<a href="https://www.avovietnam.com">
  <img src="/images/avovietnam-feature.png" alt="AvoVietnam banner" title="AvoVietnam - serious relationships with Vietnamese" class="banner-img" />
</a>
## Final thoughts

With this auto-shadow banning enabled, scammers will see an app with a bunch of fake users. Hopefully, they will continue on their merry way and stop making new accounts. AvoVietnam is free to chat between users, but if you're interested in free [AvoVietnam Gold](https://www.avovietnam.com/faq) which lets you send photos and appear at the top of the message inbox, shoot an email to [marketing@avovietnam.com](mailTo:marketing@avovietnam.com) with your account's email and we will hook you up with 1 free week.

If you have more suggestions on how to detect malicious users, send an email to [dev@avovietnam.com](mailTo:dev@avovietnam.com).