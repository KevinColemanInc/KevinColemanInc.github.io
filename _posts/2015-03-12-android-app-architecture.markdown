---
layout: post
title: "Otto meet Retrofit: How to build a scalable and performant Android application"
date: 2015-03-12 15:46:43 -0400
comments: true
categories: 
---
<img src="/images/beach2.jpg" alt="beach" title="Otto meet Retrofit: How to build a scalable and performant Android application" class="banner-img"  />

Unlike Ruby on Rails, Android app development does not have as definitive of an opinion on how apps should be developed and so we have designed our own pattern leveraging open source tools like [Otto](http://square.github.io/otto/) and [Retrofit](http://square.github.io/retrofit/) to design our applications.

After much research, we at [Spark Start](http://sparkstart.io) invested in developing a design pattern for our client applications that leverages the best practices.  Jumping right in here:

##Consuming a RESTful API

Following Object Oriented Programming's best practices, all objects should each only have one job.  With the start of a new api, create a folder with the name of the API you are trying to consume.

Inside of your client.java file, you will include your retrofit interface classes.  This file will specify how your app will be calling the API.

```java APIClient.java
  public class APIClient {
    interface IUser {
        @GET("/users/Me.json")
        void getMe(Callback<User> callback);

        @GET("/users.json")
        void getUsers(Callback<List<User>> callback);
    }
```

This keeps all of our API information in one small maintainable file.  Notice how we are always using the retrofit callback method instead of the async call.  This will allow our code to start a web request on any thread.  Now the code consuming this will never have to worry about thread locking.

```java APIManager.java
public class APIManager {
    private Bus mBus;

    public CooleafAPIManager(Context context, Bus bus)
    {
        mBus = bus;
        mAsyncRestAdapter = new RestAdapter.Builder()
                .setEndpoint(API_URL)
                .setRequestInterceptor(getCookieInterceptor())
                .setLogLevel(RestAdapter.LogLevel.BASIC)
                .build();
    }

    @Subscribe
    public void onLoadAuthenticateEvent(LoadAuthenticateEvent loadAuthenticateEvent) {

        String email = loadAuthenticateEvent.getEmail();
        String password = loadAuthenticateEvent.getPassword();

        Callback<User> callback = new Callback<User>() {
            @Override
            public void success(User user, Response response) {
                mBus.post(new LoadedMeEvent(user));
            }

            @Override
            public void failure(RetrofitError retrofitError) {
                mBus.post(new LoadedErrorEvent(retrofitError));
            }
        };

        sClient.authenticate(email, password, deviceID, callback);
    }

```

The manager class acts as a middleware between the client and the rest of our application.  For our [most recent application](http://cooleaf.com), authentication is handled by cookies, so we had to create our own cookie interceptor to handle authentication.

The manager class subscribes to the bus and watches for events that request an API call.  When a user needs to authenticate, it catches the event, creates a callback which will intern fire off a new event once the response is finished.



##Hooking in Otto into the controller classes

Otto is a great tool for managing async task events.  It has an event bus that you subscribe and unsubscribe your fragments and activities to, so when a callback (e.g. Retrofit is finished with a request), they can process the response.


```java LoginFragment.java

    @Override
    public void onResume()
    {
       super.onResume();
       BusProvider.getInstance().register(this);
    }
    @Override
    public void onPause()
    {
        super.onPause();
        BusProvider.getInstance().unregister(this);
    }

    private void onLoginClick()
    {
        BusProvider.getInstance().post(new LoadAuthenticateEvent(userName,password));
    }

```

When the login fragment is resumed, otto automatically subscribes the fragment to the bus.  When it is paused, it unsubscribes.  This is awesome, because if a request is initiated to the API, but then the fragment is closed before the rest api responds, we don't have the fragment still listening for that response.

##Conclusion

Otto and retrofit play really nicely together and are great tools for building an android app.  Managing all of the events can get a bit ugly, so be careful how you name them and organize them in the project.
