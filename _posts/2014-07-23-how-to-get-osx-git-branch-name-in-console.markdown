---
layout: post
title: "How to get OSX git branch name in console"
date: 2014-07-23 15:13:52 -0400
comments: true
categories:
---

<img src="/images/hills.jpg" alt="hills" title="How to get OSX git branch name in console" class="banner-img"  />

I have always had a problem of forgetting which git branch I was on and committing my changes to the wrong branch.  The best way I have found to solve this problem is to have the branch name printed in the console prompt.

You can modify the prompt message in OSX by setting the PS1 variable in `~/.bash_profile`

First you need to parse the git branch name by using this function

```console .bash_profile
parse_git_branch() {
    git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/ (\1)/'
}
```

Now you need to set your PS1 variable so that it shows the parse branch I added a bit of color to mine so I can see it more clearly.

```console .bash_profile
export PS1="\# \u \w\[\033[32m\]\$(parse_git_branch)\[\033[00m\] $ "
```

Cheers.

