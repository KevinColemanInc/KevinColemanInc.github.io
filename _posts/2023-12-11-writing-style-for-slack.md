---
layout: post
title: "Writing Style for Slack"
date: 2023-03-11 01:49:55 -0400
comments: true
categories: writing slack
---

This week, I will have worked remotely for overseas companies for a 5 years. The first company was Zugata, an HR tech startup. I worked remotely from Vietnam with my peers and manager based in Palo Alto, California. The second (and current) company is Grab.com, the Uber+Banking for Southeast Asia. I work in Seattle and communicate daily with teams in Bengaluru, India, Kuala Lumpur, Malaysia, and Singapore.


As many know or suspect, communication with a 12-hour delay is not efficient. Miscommunications or lack of communication adds at least a 1-day delay (more for weekends and holidays), therefore thoughtful and intentional communication is critical for career success.


In the early days of my career, people wouldn't answer my questions, not trust what I was sharing, or take forever to respond. From these experiences, I developed the following writing style for Slack to mitigate communication gaps and speed up my project deliveries.


I want to share 5 Slack writing techniques that I have learned when communicating with my peers in a 12+ hour timezone and at the very end, I share my writing template for how I structure most of my async communication (email or slack).


##  Summary

1. Know your audience.
2. Be concise.
3. Speak with confidence.
4. Know your goals.
5. Use this template.


## Know your audience


Follow-up questions instantly delay projects by +1 days. Know your audience and provide the context they need to answer your questions.


Avoid acronyms, because you never know if they know them.


Define proper nouns, that they might not be familiar with. For example, "The Obi-Wan service has high latency" is bad, b/c they might not know what Obi-Wan is.


## Be Concise


When your peer wakes up at 6am, they do not want to see an essay-length slack message. The message will be marked as "read" with the intention of responding later, but quickly forgotten.


Remove filler words or phrases. (For example, "By the way...", "I was wondering about...")


Speak with confidence. "I think that I can possibly consider agreeing" 👉 🗑️. Don't share weak decisions or opinions. Either agree, or disagree.


Avoid phrases like, "I think..." b/c everything you write is what you think. no need to double explain.


Offer a summary. If the message must be long, include a summary to help the reader prioritize when they need to respond.


Do your homework. If you're not confident about an assumption, do your own research before stating facts or asking for help. If the reader find a hole in your premise, then you lost a day regrouping.


Cite your sources. If you weren't confident about a key fact, perhaps your reader is too. Link to the documentation relevant to your slack message. This serves two purposes: so the reader can dive deeper if they want, and so you can find your sources later if you need to dive deeper yourself.


Provide explicit, clear answers to questions. If someone asks you a Yes or No question. Respond with yes or no. Don't make the reader guess.


## Clarify your needs

Clearly state what you need from them. Often my peers will intertwine questions in context or not be explicit with their needs. I've seen people (intentionally or unintentionally) avoid answering critical questions, b/c they "missed" them.

Provide the reader enough context to meet your goals.

## Speak in the open


Public topics should be in public channels and private topics should be in private DMs. Almost every private conversation about a project needs input from other people. Having these conversations in open channels will help future people joining the project have access to earlier discussions. Open channels are also searchable. 

I always move project conversations from private DMs to public channels, b/c of the time, other people will need to be involved.


## Use this template


> greeting: Hi {person|team},
> 
> TLDR: If my message gets long, I will include a 1-line Too Long; Didn't Read to help the reader decide if they actually want to read my message now if it can wait until later.
> 
> Context and the problem: Here I provide context to the problem, assuming they have no idea what I am talking about. I do not want them to ask follow-up questions, because those add delays. I do not use acronyms.
> 
> end: A clear, ordered list of questions, sorted to match the context.
> 1. Question 1
> 2. Question 2

Example

> Hi team,
> 
> The latency graph (dasboard link) to our messaging service (code link) from your service (client code link) increased > 15% week over week. We have not made any deployments in 2 weeks (deployment log link) or configuration changes > (configuration dashboard link).
> 
> 1. Has anything changed with the amount of traffic or size of the payload from your system?
> 2. Is there someone that can help me investigate this?

In this example, I assume whoever is on-call knows (almost) nothing about their teams' integration with my team's servers.

If you have more tips you want to share, send me an email kevin@sparkstart.io