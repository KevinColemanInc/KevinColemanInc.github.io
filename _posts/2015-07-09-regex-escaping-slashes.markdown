---
layout: post
title: "Regex: Escaping Slashes"
date: 2015-07-09 07:49:01 -0700
comments: true
categories: 
---

<img src="/images/buildings.jpg" alt="buildings in czech" title="Regex: Escaping Slashes" class="banner-img"  />

Escaping slashes in can leave regex expressions difficult to read.  A regex statement that is meant to identify a url like this one `http://atdc.org/wp-admin/admin-ajax.php`.

would look something like this using the standard `/expression/` notation:

```
/http:\/\/atdc.org\/wp-admin\/admin-ajax.php/
```

But if you use the `%r{expression}` notation, then your regex expressions do not need to be muddled with escaping slashes:

```
%r{http://atdc.org/wp-admin/admin-ajax.php}
```

Much easier to read :)