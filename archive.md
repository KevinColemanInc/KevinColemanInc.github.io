---
layout: default
title: Archive
permalink: /archive/
---

<div class="archive">
  <h1>{{ page.title }}</h1>

  {% assign posts_by_year = site.posts | group_by_exp: "post", "post.date | date: '%Y'" %}
  {% for year in posts_by_year %}
    <section class="archive-year" aria-labelledby="year-{{ year.name }}">
      <h2 id="year-{{ year.name }}">{{ year.name }}</h2>
      <ul class="post-list">
        {% for post in year.items %}
          <li>
            <span class="post-meta">{{ post.date | date: "%b %-d" }}</span>
            <h3>
              <a class="post-link" href="{{ post.url | relative_url }}">{{ post.title | escape }}</a>
            </h3>
          </li>
        {% endfor %}
      </ul>
    </section>
  {% endfor %}
</div>
