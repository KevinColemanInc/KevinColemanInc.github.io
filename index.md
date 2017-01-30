---
# You don't need to edit this file, it's empty on purpose.
# Edit theme's home layout instead if you wanna make some changes
# See: https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: home
---

<div class="blog-index">  
  {% assign post = site.posts.first %}
  {% assign content = post.content %}
  <h1 class="entry-title">
  {% if page.title %}
      <a href="{{ root_url }}{{ page.url }}">{{ page.title }}</a>
  {% endif %}
  {% if post.title %}
      <a href="{{ root_url }}{{ post.url }}">{{ post.title }}</a>
  {% endif %}
  </h1>
  <div class="entry-content">{{ content }}</div>
</div>
<br>
<br>
<hr>
<br>
<br>
<h3> More posts</h3>