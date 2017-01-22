---
layout: post
title: "Rapid Ticket Purchasing and the extendable web"
date: 2014-04-16 12:30:31 -0400
comments: true
categories: Chrome
---

## Backstory
Last month, I was interested in attending a camping event with my girlfriend.  The event organizers release the tickets in two phases with each phase releasing 1000 tickets.  Despite my wicked fast internet connection at Panera Bread, I was unable to purchase the released tickets before they sold out.

In an effort to learn new things, I put my hand towards creating an auto-buy Chrome extension to significantly increase my chances of a ticket purchase.  I also intended to open source the project so anyone would be able to contribute.  Enter [rapid_fire_tickets](https://github.com/KevinColemanInc/rapid_fire_tickets).

## Building the Chrome Extension
If you get lost, feel free to download the source code for this extension at [https://github.com/KevinColemanInc/rapid_fire_tickets](https://github.com/KevinColemanInc/rapid_fire_tickets)

Chrome extensions allow you to inject javascript on the page for DOM manipulation.  Firstly, you should create a directory and with our project name as the title.

Now create a `manifest.json` file.  This file contains all of the high level descriptive information about your project like the name, description, what permissions it wants, what version it is, etc.


```json manifest.json
{
  "manifest_version": 2,

  "name": "Rapid fire tickets for Transformus",
  "description": "This extension automatically keeps trying to buy tickets for Transformus.",
  "version": "1.0",

  "content_scripts": [
    {
      "matches": ["http://www.brownpapertickets.com/event/614931*"],
      "js": ["jquery.js", "home.js"],
      "run_at": "document_start"
    },
    {
      "matches": ["http://www.brownpapertickets.com/viewcart.html"],
      "js": ["jquery.js", "checkout.js"],
      "run_at": "document_end"
    }
  ]
}
```

The first part is very self explanatory, but the `content_scripts` attribute is much more interesting.  Here you can request Chrome to run javascript files if the URL pattern matches the string provided.  Since I know that the ticketing website’s URL is such, I included that in the matches string.  The asterisk at the end of the string protects me against any strange URL parameters that might present themselves.

The `js` attribute tells Chrome to run the included js files when that URL is hit.  I included `jQuery` in this extension so make life easier.  Then I put my custom js file that will be used to refresh the page and select tickets.

The `run_at` attribute requests that chrome run the JS at document start.  I did this because I wanted the JS to run before all of the attributes to load so it will behave faster.

Next I will go download `jQuery` and save it into this folder.  Be sure to name the file the same as how you named it the manifest file.

Next I will create my home.js file.  The idea here is to have it refresh the page until the we see the drop down for ticket selection.  Once that appears we need to set that to a value of 2 and click the submit button on the form.

## Testing
From that link, we have no idea what the HTML looks and thus don’t know how to sculpt the jQuery selectors to target the correct form elements.  I created a test event and modeled it to behave exactly like the tfus event will when the tickets are released.  This way I can test my software before aiming it at the first event.

## Refresh and check to see if tickets are available
```javascript
$( document ).ready(function() {

  if ($(".bpt_orangebutton").length != 0)
  {
    //buy tickets
  }
  else
  {
    location.reload(); //reload
  }

});
```

On my test page I noticed that the orange submit button appears on the page when tickets are available.  For this tool, I am going to look for all orange buttons on the page.  If one appears, then tickets are ready to be purchased.  If they are not, then we need to reload the page to check again.

## Select the number of tickets you want
Now that I can detect when the tickets are available.  I am need to select the drop down and select the number of tickets.  

```javascript
 $("#bpt_date_prices_1017125 .bpt_widget_price_table tr:nth-child(4) select").val(2);
    $(".bpt_orangebutton").click();
```

Using Chrome development tools, I found that this selector worked nicely at accomplishing that.  The id of the first element changes event to event, so if I wish to use this against other events, this will need to change.

Putting it all together we get this:

```javascript home.js
$( document ).ready(function() {
  if ($(".bpt_orangebutton").length != 0)
  {
    $("#bpt_date_prices_1017125 .bpt_widget_price_table tr:nth-child(4) select").val(2);
    $(".bpt_orangebutton").click();
  }
  else
  {
    location.reload();
  }
});
```

A super simple auto add to cart ticket file.

## One step further
After the tickets have been added to cart, it displays a page asking if you would like to check out now.  Under most circumstances, this scenario is yes.  To speed up the ticket purchasing process, I added another script to auto-click this button.  We can just skip that page and go to directly to the credit card input page.

The script that handles this is similar to the last one and looks like this:
```javascript
parent.location='https://www.brownpapertickets.com/checkout.html';
```
Rather than locating that button and click it.  I recognized that button is just a link to the checkout page so I ask the browser to relocate to this page.  If there are an cosmetic changes to this page and they change how the page is displayed, it may break any selectors I use on finding that button.  This solution is much more elegant and simple.

## Installation

3. In Chrome to [chrome://extensions/](chrome://extensions/) and click "Load unpacked extensions"
4. Navigate to the location of the folder you created with the manifest.
5. Sign into your [http://www.brownpapertickets.com](http://www.brownpapertickets.com) account
5. Open a bunch of tabs in chrome and navigate them all to: [http://www.brownpapertickets.com/event/614931](http://www.brownpapertickets.com/event/614931)

### Alternative installation (using my source code on [github](https://github.com/KevinColemanInc/rapid_fire_tickets)).

1. Download the [zip file](https://github.com/KevinColemanInc/rapid_fire_tickets/archive/master.zip)
2. Unzip it
3. In Chrome to [chrome://extensions/](chrome://extensions/) and click "Load unpacked extensions"
4. Navigate to the unziped location of the file.
5. Sign into your [http://www.brownpapertickets.com](http://www.brownpapertickets.com) account
5. Open a bunch of tabs in chrome and navigate them all to: [http://www.brownpapertickets.com/event/614931](http://www.brownpapertickets.com/event/614931)



## Buying more than two tickets
This extension will only purchase two tickets per installation of Chrome.  If you are interested in using this to accumulate more, then here are my recommendations.

In [chrome://extensions/](chrome://extensions/), scroll down to the rapid_fire_tickets and select "Allow in incognito mode."  Incognito mode allows you to login to Brown Paper Tickets from another account (thus giving you an additional 2 more tickets).

Now press `Ctrl+Shift+N` to open a new incognito window, login to a different account and navigate to the event page.  Now you buy 4 tickets!

Next, we should install a couple copies of Chrome.  Chrome only allows one version to be installed on a computer at a given time.  So lets grab other builds!  Go to [http://www.chromium.org/getting-involved/dev-channel](http://www.chromium.org/getting-involved/dev-channel) and download and install their canary release.  This version runs seperately from what you have on your computer, because it can be less stable.

Configure the extension like you did before and now you have 8 tickets you can purchase!  Remember, only two tickets can be purchased at once per account so be sure to use different accounts.

### Quick tip: One gmail for multiple accounts
If you use gmail, you can use their wild card feature to have different emails that point to your email.  For example my email is c.programer@gmail.com.  I can create a different brown paper tickets account with this email c.programer+bpt@gmail.com and all of the emails going to that new email go to my main inbox.  This way I don't have to keep creating emails to make new accounts.  Anything between the + and the @ symbols are ignored in gmail only.

### Lets scale this further (8 to infinite and beyond!)

We can apply this technique to multiple computers.  Each computer earns you 8 tickets. So if you are like myself that has a laptop and a desktop and a gf's computer, then I would have the opportunity to purchase 24 tickets!  This scales at 8 tickets per computer.  So 10 computers allows you to purchase 80 tickets (or 8% of all tickets avaliable!).

For those with more resources, you can go to a public library or a college's computer lab to install an apply this extension to an even larger number of computers.

## Conclusion

Feel free to hack and fork this tool as much as you would like.  I really hope that everyone enjoyed reading this as much I as I enjoyed writing it. Best of luck to everyone buying tickets this weekend!

## Notes

I would be careful about opening too many tabs, because they may actually slow down the process.  In experimentation, I was able to grab 2 tickets to an event I created with 12 tabs within 10 seconds of the release.

This currently attempts to grab the maximum amount of tickets (2).

# PLEASE PLEASE PLEASE check back with the project an hour before tickets become avaliable.  I plan on releasing an updated version of the project to handle any issues that may arise.
