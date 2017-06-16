---
layout: post
title: "NodeJS Chat Guide"
date: 2014-04-30 12:40:07 -0400
comments: true
categories: 
---

## How I built the chat application for my blog.

I have been chatting on wizpert offering technical support for questions and I was inspired to add a chatting aspect to my blog.  Feel free to hit me up on any Javascript, Ruby on Rails, or general programming questions.

## Installing NodeJS v0.10.26 on OSX Maverick 10.9

I recommend installing this application with homebrew, so you can easily update it as you need to.

```console install nodejs
brew update
brew doctor
brew install node
```

Create a folder called `Chat` and create a file in that called `main.js`

```console create a git repo
git init
git add .
git commit -m "first!"
```

## Creating the NodeJS chat server

```javascript
var xmpp = require('node-xmpp');

var cl = new xmpp.Client({ jid: process.env.jid,  password: process.env.password })

var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

var users = {};
var admins = {};

var adminXMPP = [ ];

server.listen(process.env.PORT || 3000);
 
io.sockets.on('connection', function(socket) {
    socket.emit("message_to_client",{ message: "Welcome to the chat", name: "Server", "isAdminOnline" : (adminXMPP.length > 0) });

    //Admin
    socket.on('admin_signin', function(data) {
      console.log("register admin");
      admins[socket.id] = socket;
      users[data["user_id"]].admin_connected = socket
    });

    socket.on('admin_to_server', function(data) {
        users[data["socket_id"]].socket.emit("message_to_client",{ message: data["message"], name : "Kevin" });
        socket.emit("message_to_client",{ message: data["message"], name : "Kevin" });
    });

    //Client
    socket.on('message_to_server', function(data) {
        if (users[socket.id] == null)
          users[socket.id] = {socket: socket, name: data["name"], admin_connected: null };
        socket.emit("message_to_client",{ message: data["message"], name : data["name"] });

        if (users[socket.id].admin_connected == null)
        {
          var stanza = new xmpp.Element(
            'message',
              { to: process.env.email, type: 'chat' }
          ).c('body').t(data["name"] + " says " +data["message"] + " to talk with them click here: http://ss-chat-p.herokuapp.com/admin#" + socket.id);
          
          cl.send(stanza);
        }
        else
        {
          users[socket.id].admin_connected.emit("message_to_client",{ message: data["message"], name : data["name"] });
        }

    });
});

cl.on('stanza', function(stanza) {
  if (stanza.name == 'presence')
  {
      if (stanza.attrs.type == 'unavailable' && stanza.attrs.from.substring(0,'c.programer@gmail.com'.length) == 'c.programer@gmail.com') {
        for (i = 0; i < adminXMPP; i++)
        {
          if (adminXMPP[i] == stanza.attrs.from)
          {
            adminXMPP.splice(i, 1);
          }
        }

        return;
      }
      if (stanza.attrs.type == null && stanza.attrs.from.substring(0,'c.programer@gmail.com'.length) == 'c.programer@gmail.com') {
        adminXMPP.push(stanza.attrs.from);
        return;
      }
  }

});

cl.addListener('online', function(data) {
  set_status_message("SparkBot is ready");
    console.log('Connected as ' + data.jid.user + '@' + data.jid.domain + '/' + data.jid.resource)
})

cl.addListener('error', function(e) {
    console.error(e)
    process.exit(1)
})

function set_status_message(status_message) {
   var presence_elem = new xmpp.Element('presence', { })
                               .c('show').t('chat').up()
                               .c('status').t(status_message);
   cl.send(presence_elem);
}
```

I create all of the singleton variables at the top of the nodejs file. `xmpp` is used for connecting to Google Talk.  `app`, `server`, and `io` are used to host the server and talk with the client via sockets.io.

I need to keep track of what `admins` are connected and what `users` are connected.  While there will only be one admin account, they can be logged into multiple locations.  For users, I need to keep track of their socket and their names to send to the client.  These will both be hash arrays keyed on their `socket.id`.

`server.listen(process.env.PORT || 3000);` tells the server to listen to the hosting port.  Heroku wants to set its own report, so you must try to environment report before you use the development port (3000).

Once a socket has connected, we send them a welcome message via chat.  This also contains where or not the admin is available to talk.

When an admin connects, we add them to the registered admins list and set the admin socket on the users hash to the admin socket so when a client messages, we will know which admin socket to send it to.  Each socket represents its own chat session with a client.

When the server gets a message from the admin, it runs the `admin_to_server` event and it transmits the message to the client and back to the admin.  This way both users can see the message.

Clients trigger the `message_to_server` action when they want to send a chat message to the admin.  If we haven't seen this user before, we add them to the users hash and spit their message back to them.  If the admin hasn't connected yet, it sends a xmpp message to the admin's gmail account notifying them that they someone is interested in talking with them.  The URL in the message contains the user's socket so the server will know what admin socket is intended for what user.

If the admin has connected, then it transmits it to their socket.

We need to keep track of when the admin is available for contact.  When the server starts, it initiates an xmpp connection and starts getting notifications about contact statuses.  If a user changes status or logs in, we add the admin to the `adminXMPP` so we know who to contact when a client arrives.  If they log out, they are removed from `adminXMPP`.  If the length of the array is 0, no admins are available and we report that to clients.

The status message is set to 'SparkBot is ready' when the xmpp client connects and it displays their user information in the logs.

If there are any errors with the xmpp client, they are displayed in the logs and the process is killed.

The `set_status_method` function wraps the xmpp request to set the status message for the Google Talk client.sdfsdf
## Creating the Client view
This blog is hosted on Github Pages and talks with my server on a different subdomain (chat.kcoleman.me).  I loved the style of Google Talk's chat window with the speech boxes pointing to a profile pic.  Since I don't have a profile pic to use, I replaced that with a name.  You can style this code to your hearts content, but the Javascript I used looks like this.

```javascript
   var socketio = io.connect("ss-chat-p.herokuapp.com");
    socketio.on("message_to_client", function(data) {

        var msgHTML = "<div class='avatar'><b><span>" +
        data["name"] + "</span></b>" + "</div><div class='messages'>"+ data['message'] + "</div>";

        if (data["name"] == document.getElementById("name").value)
        {
          msgHTML = "<li class='self'>" +  msgHTML + "</li>";
        }
        else
        {
          msgHTML = "<li class='other'>" +  msgHTML + "</li>";
        }

        document.getElementById("discussion").innerHTML = document.getElementById("discussion").innerHTML + msgHTML;

        $("#discussion").prop({ scrollTop: $("#discussion").prop("scrollHeight") });
    });
    
    function sendMessage() {
        var msg = document.getElementById("message_input").value
        var name = document.getElementById("name").value;
        socketio.emit("message_to_server", { message : msg, name : name });
        document.getElementById("message_input").value = "";
    }
```

It first tries to connect to the server.  When it receives a message to display, the `message_to_client` action is triggered.  Here I format the HTML as a string based off of the data payload.  Then it adds into the discussion window.

When a user clicks the submit button, I get the values of the input name and message box and send them to the server as "message_to_server" and then clear the box for the next message.

Because this uses Sockets.io, we need to include their library in the client as well.

```html
  <script src="http://ss-chat-p.herokuapp.com/socket.io/socket.io.js"></script>
```

## Creating the Admin View

This code should look pretty similar to the client, except we need the admin to register right when it connects so we can start sending him the client messages.

```javascript admin page
var socketio = io.connect("chat.kcoleman.me");
register();

var target_user = document.URL.substring(document.URL.indexOf("#")+1);
socketio.on("message_to_client", function(data) {
    document.getElementById("chatlog").innerHTML = ("<hr/><b>" +
    data["name"] + "</b>: "+ data['message'] + document.getElementById("chatlog").innerHTML);
});



function register() {
    socketio.emit("admin_signin", { user_id: target_user });
}

function sendMessage() {
    var msg = document.getElementById("message_input").value;
    socketio.emit("admin_to_server", { message : msg, socket_id : target_user});
    document.getElementById("message_input").value = "";
}
```
When the client connects, it immediately tries to register itself so that the system will know it is available to receive messages.


## In the Future

I want to be able to retrieve the client's user agent so if there are any browser compatibility errors, I can easily see what browser they have.  If there is a strong need, I may look at implementing a co-browsing solution so I will be able to follow along with them as they navigate my website.
