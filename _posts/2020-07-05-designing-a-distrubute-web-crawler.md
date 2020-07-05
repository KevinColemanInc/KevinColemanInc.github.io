---
layout: post
title: "Designing a distributed web crawler"
date: 2020-06-14 01:49:55 -0400
comments: true
categories: 
---

<img src="/images/system-design-at-the-beach.jpg" alt="Lifeguard stand at the beach" title="Lifeguard stand at the beach" class="banner-img" />

##  Summary

Design a web crawler that fetches every page on en.wikipedia.org exactly 1 time. You have 10,000 servers you can use and you are not allowed to fetch a URL more than once. If a URL fails to be fetched (because of a timeout or server failure), it can be discarded.


##  Related Companies

* Facebook.com (Interview question)
* Wikipedia.org (Example website to crawl)
* Archive.org


##  Topics Discussed

* Hashing
* Distributed Systems
* Consistent Hashing
* Bloom Filter
* Trie Data Structures
* Consumer Groups (Kafka)
* Paxos


##  Requirements

### Functional

*   Download all (6.5m) URLs from en.wikipedia.com
*   Only download each URL **<span style="text-decoration:underline;">once</span>**
*   Using 10k 2-core servers
*   Only processing on the content is extract URLs otherwise persist the content to local storage
*   Don't crawl images
*   Only crawl English Wikipedia
*   Minimize network traffic between each server.


### Non-functional

*   No need to self-rate limit
*   Fetch the content as fast as possible


##  High-level Analysis

### How much storage will we need to store 6,500,000 URLs and their HTML documents?

The average internet URL length is 66 characters. Since we don't need to track the domain name or HTTPS prefix, we will round down to 60 characters.


    60 characters = 60 bytes

    60 bytes *  6,500,000 URLs = 390000000 bytes or 390 Megabytes

The average HTML page is about 100kb.

    100 kilobytes * 6,500,000 documents = 650 Gigabytes


### How do we want to store the URLs?

Similar to the URL shortening system design problems, the most practical way of storing URLs that we have visited is a Set Structure for O(1) lookup. While the hashes approach will consume more memory, since we will be storing the full URL, than a [Trie Data Structure](https://en.wikipedia.org/wiki/Trie) or binary search tree, the lookups will be much faster (O(1) vs O(n)) and the additional memory cost will be manageable.


### Where can we store the URLs?

390 Megabytes for all URLs can easily be stored in RAM, meaning we can get away with using an in-memory RAM solution for managing which URLs we have tracked.

65 Gigabytes is more than we can cost-effectively store in RAM on a single server. If we need to store the documents on a single server, we will need to write to the local hard drive. Because we have 10,000 servers, we could evenly distribute the documents, so each server would only need to store 3.9 GB of HTML. 3.9 GB can easily be stored in RAM at a reasonable price.


### Where will be the limitations? CPU? Disk? Network?

CPU: The most expensive task for the CPU will be extracting the URLs to be crawled from the HTML documents crawled so far. This task should take less than 1ms per document.

Disk: As mentioned above, we probably don't need to be writing to disk at all since the documents, when distributed across the 10k servers, will fit into memory.

Network: Round trip to wikipedia.org for a single document may take ~200ms depending on their load and the distance our servers will be from theirs.

This will be a Network bound task with the opportunity while waiting for the network responses for our CPUs to parse the existing HTML documents of their URLs.


##  Design Options


### Option 1: Single server

We will start simple and expand to maximize the resources of the problem.

A naive approach would be for a single server to fetch a URL, extract the URLs from the document and then query the next URL


```python
queue = ["https://wikipedia.org"]
seen = set()
while queue:
  URL = queue.pop()
  page = download(URL)
  URLs = extract_URL(page)
  for URL in URLs:
   if not(URL in seen):
      queue.append(URL)
```


**Follow up questions they may ask:**



1. How do we know how many URLs we can safely fetch from one server at a time?

For this, we will need to experiment with timeouts to determine when we are rate limited. Typically systems throttle too many connections coming from a single ip address to prevent them from abusing the service.


#### Pros



1. Simple


#### Cons



1. Does not utilize the 10k servers
2. Wastes CPU cycles waiting for the web request to complete
3. A server failure results in complete data loss


### Option 2: Distributed Systems

Assigning each URL to a specific server lets each server manage which URLs need to be fetched or have already been fetched. Each server will get its own id number starting from 0 to 99,999. Hashing each URL and calculating the modulus of the hash with 10,000 can define the id of the server we need to fetch the URL from.

In a master/slave design, a single master server could map the server ids to specific ip addresses. Since the problem asks us to reduce network traffic, we can either pre-configure each server with an id to ip address or rely on a DNS server to map hostnames to ip addresses (e.g. 123.crawler.company.com points to server 123). In case there is a failure and the server id needs to be assigned to a new server, the dns record would be updated to point to the new healthy server.


```python
server_num = hash("/wiki/The_Entire_History_of_You") % 10000

##  Directly talk to the server
server_ip = num_to_ip_dict[server_num]

##  Using a DNS server
server_host = f'http://{server_num}.crawler.company.com'
```


Since every URL will be uniquely assigned to a single server number, each server will internally track which URLs it has already crawled, just like the single server design. The single server design uses a `set`, but we could also use a Bloom Filter.


#### APIs

Each server will need to implement an API to receive a set of URLs that the other servers find in their pages. We can use JSON and REST to route these requests.


```
POST /fetch_URLs HTTP/1.1
Host: 2.crawler.company.com
Body:
{
  URLs: ["/wiki/Consistent_hashing", "/wiki/Hash_table"]
}

Response: 202
```


The URLs attribute should be a unique list of URLs found in the html documents that the server found at its own URLs. We should avoid sending 1 web request per document because each network request has overhead. We could collect URLs and send them to the other machines in batches of 100. If we sent the URLs to the other machines as we extract them, each document may trigger N-network requests for each URL.


<img src="/images/distributed-web-crawler.png" alt="Distributed Web Crawler Design Flowchart" title="Distributed Web Crawler Design Flowchart" />


[[Source](https://docs.google.com/presentation/d/1BOWsk4L68pDx7u1GpXF-NqOTejrAffsJmdolQVCnO3Q/edit#slide=id.p)]


#### Follow up questions:

**How can you distribute the URLs if a portion of the 10k servers lose power while the crawl is happening?**

Borrowing from [Kafka's system design](https://kafka.apache.org/documentation/#design), we can use the concept of "consumer groups". Instead of sending the URLs to be fetched to a single machine, we could divide the 10,000 servers into groups that are collectively responsible for managing the URLs assigned to their group. One machine would receive the URLs to be fetched using a consistency algorithm like Paxos to decide within a group which machine will be fetching the URL. 

If an entire group fails, we can use the technique called "Consistent hashing" with log(M) hashing algorithms to evenly distribute the load, where M is the number of groups. When a URL is found, it is hashed with k hashing functions


<img src="/images/consistent-hashing.png" alt="Example of how Consistent Hasing" title="Example of how Consistent Hasing" />

[[Source](https://docs.google.com/presentation/d/1BOWsk4L68pDx7u1GpXF-NqOTejrAffsJmdolQVCnO3Q/edit#slide=id.p)]


#### Pros

*   Fully utilizes all 10,000 machines
*   Minimizes network activity
*   Fetches each URL once :)
*   Handles distributed system failures


#### Cons

*   Despite randomly assigning URLs to each group, a single group may get unlucky and be assigned either a disproportionately large number of URLs or URLs that are larger and take longer to parse.


##  Additional Reading

*   [Decoded: Examples of How Hashing Algorithms Work](https://dzone.com/articles/decoded-examples-of-how-hashing-algorithms-work) (blog)
*   [What is Consistent Hashing and Where is it used?](https://www.youtube.com/watch?v=zaRkONvyGr8) (youtube)
*   [Bloom Filters](https://www.youtube.com/watch?v=bEmBh1HtYrw) (youtube)
*   [Trie Data Structures](https://www.geeksforgeeks.org/trie-insert-and-search/) (GeeksForGeeks)
*   [Scalability of Kafka Messaging using Consumer Groups](https://blog.cloudera.com/scalability-of-kafka-messaging-using-consumer-groups/) (blog)
*   [The Paxos Algorithm](https://www.youtube.com/watch?v=d7nAGI_NZPk) (youtube)