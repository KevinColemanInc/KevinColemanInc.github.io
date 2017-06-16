---
layout: post
title: "Setting up a Ruby on Rails 4.0.1beta1 with OSX Mavericks 10.9"
date: 2014-02-14 01:21:15 -0500
comments: true
categories:
  - Ruby on Rails
---

I keep having to setup Rails environments for people so I am just going to write my first blog article on how to do it on OSX 10.9.  

## Installing the Command line tools
The GCC compiler is required with installing RVM and Brew, so you need to download and install the xcode command line tools.  Open terminal and type in this:


``` console Install Command line tools
  $ xcode-select --install
```

## Installing HomeBrew
Homebrew is a package manager that makes it stupid easy to install and update software.  We will be using this tool to install Git, Postgres, and RVM.  To install this tool enter this into the terminal:

``` console Installing HomeBrew
  $ ruby -e "$(curl -fsSL https://raw.github.com/mxcl/homebrew/go/install)"
  $ brew doctor
```

The first command fetches and installs brew.  The second will update brew and fetch the latest installation scripts

## Installing Postgres
Most guides recommend installing MySQL as the db engine, but because Heroku defaults to Postgres and Postgres is the hot right now, I use it in dev and in my production environments.

To install, type this command into the terminal:

``` console Installing Postgres
  $ brew update
  $ brew install postgresql
```

At the end of the install, follow the instructions for how to startup the server.  I would recommend to have it autostart with login, so you don’t have to think about it.  If you wish to manually start it when you need it, don’t lose that command to start it.

## Installing RVM
RVM is a ruby version manager.  It allows you to install multiple versions of ruby on your computer and easily switch between them.  This is important because as new versions of ruby on released, you will want to be able to test websites before deploying them and you may need to switch back to an old version if you encounter bugs.

``` console Installing RVM
  $ \curl -L https://get.rvm.io | bash -s stable
```

## Install Rails
To install the rails toolset type in this to terminal:

``` console Installing Rails
  $ gem install rails
```
This gives you rails command in terminal and allows you to create new rails websits.  To verify this installed properly type:

``` console Installing Rails
  $ rails --version
  Rails 4.1.0.beta1 
```

## Installing Git
git is the most common tool for managing source code.  I would recommend creating an account on github and using that as your source control.  Check out these guides for a quick start with git

### Quick start git guide from the terminal
This is one of the best guides I could find on how to quickly emerse yourself into git.
[Git Guide](http://rogerdudler.github.io/git-guide/ "Git Guide")


### GitHub flow
I uses this pattern for the repo if more than one person is working on it.
[What is GitFlow?](http://scottchacon.com/2011/08/31/github-flow.html "Github Flow")

### To install Git CLI
In order to have the most amount of control over your git repo, you will need to install the Git CLI.  Using the CLI can be intimidating at first, but it is definately worth learning.

``` console Git CLI
  $ brew update
  $ brew install git
```
### To install Github GUI
I also use Github’s GUI tool because it makes committing easier.  Unfortunately it tends to fall flat on its face outside of the happy path (read merge conflicts and rebasing), so you can’t completely rely on this tool for git management.

Follow the instructions here
[Github for mac](http://mac.github.com/ "Github tool")

## Install Heroku toolbelt
[Heroku](http://Heroku.com/ "Heroku") is a popular hosting service for rails applications, mostly because it is free and easy to use.

Make an account at [http://heroku.com/](http://Heroku.com/ "Heroku")

Install the toolbelt found here [Heroku Toolbelt](https://toolbelt.heroku.com/ "Heroku Toolbelt")

## Optional: Installing Sublime
Sublime is probably the most common text editor for Rails development.  You can download it here: [Sublime](http://www.sublimetext.com/  "Sublime")
