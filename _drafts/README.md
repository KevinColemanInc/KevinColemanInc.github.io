# Drafts

This folder holds Jekyll drafts. Files in `_drafts/` are not published unless you build with the `--drafts` flag.

## How to use
- Create a draft in `_drafts/` with front matter (no date required):

```
---
layout: post
title: "Your Draft Title"
---

Draft content goes here.
```

- Preview locally with drafts:

```
bundle exec jekyll serve --drafts
```

- Publish later by moving the file to `_posts/` and adding a date to the filename, e.g. `2026-01-28-your-draft-title.md`.

## Alternative (single-file) draft
You can also keep a post in `_posts/` and add `published: false` in the front matter to prevent publishing.
