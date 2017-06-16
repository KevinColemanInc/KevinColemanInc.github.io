---
layout: post
title: "Wildcard Google Auth for multiple subdomains"
date: 2016-12-28 00:02:22 -0300
comments: true
categories: 
---
<img src="/images/bike.jpg" alt="bike" title="Playground" class="banner-img"  />

At [Zugata.com](www.zugata.com), we setup demo docker boxes for our customers to play around in to get a feel for how our product works with a set of randomly generated data.  This gives them a taste of the power Zugata gives employees and HR departments for driving employee development.

In order to keep our authentication secure, we require all of our staff to authenticate with Google oAuth into our internal firewall protected admin panel.  This forces better security practices for all of our employees and provides better protection of our customer's data, even for our demo instances with fake data.

Since each demo instance gets its own unique subdomain, we found we were constantly logging into the Google API console and adding each new subdomain to the redirect_url whitelist for google to let us into the admin interface of the domain.  Google is very particular about what domains it is willing to redirect back to and it does not support wild cards, even for subdomains.

To get around Google's limitation, we setup the subdomain `login.sampledomain.com` and added that to the Google white list.

## On a top level, how this works is:

1. User tries to login into `demo1.sampledomain.com`
2. Get redirected to Google with the `state` variable set to `demo1` (our subdomain)
3. Authenticates
4. Google redirects back to `login.sampledomain.com`
5. `login.sampledomain.com?auth_params...` redirects to `demo1.sampledomain.com?auth_params...`

## How to build it with simple nginx config
`nginx` is really powerful and it lets you do some pretty interesting things with urls without much coding knowledge or an application layer managing the requests.  Add the following lines to your the `conf` on your nginx machine

```
   location / {
       return 302 http://$arg_state.sampledomain.com/users/oauth/google_oauth2/callbacks$request_uri;
   }
```

When a user hits `http://login.sampledomain.com?state=demo1` it will do a temporary redirect to `http://demo1.sampledomain.com/users/oauth/google_oauth2/callbacks?state=demo1`, keeping all of the params of the original request and passing them onto the demo instance specified in the state argument.

This kicks the user back to the correct demo subdomain with the authentication params and lets the server authenticate the user.

### Caveat
Because this is making use of the state variable in the oauth request, a better implementation would also include random characters stored on the session to prevent any redirection attacks along with the domain name.  So your state would look like "demo1|RANDOMLETTERS", but that would require more advanced nginx scripting.