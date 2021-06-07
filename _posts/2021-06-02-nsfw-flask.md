---
layout: post
title: "NSFW Image detection on Digital Ocean Apps"
date: 2021-01-22 01:49:55 -0400
comments: true
categories: 
---

<img src="/images/hot-dogs.jpg" alt="row of hot dogs with various sauces and condiments" title="row of hot dogs with various sauces and condiments" class="banner-img" />

## NSWF Porn detection microservice

I built a low-cost NSFW API hosted on [Digital Ocean's new App Platform](https://docs.digitalocean.com/products/app-platform/).

### How do image tagging ML models work?

Making predictions based on images involves two basic steps: training the data and then processing the prediction. How to train the ML model can be found in the Github repo: [GantMan/nsfw_model](https://github.com/GantMan/nsfw_model#training-folder-contents).

The prediction API first fetches the remote image and saves the bytes to disk. Persisting to disk simplifies communicating with the ML library since the library accepts a file path, not a byte stream.

Then the image is resized to fit the dimensions of the ML model. The ML algorithm needs to compare apples to apples and so resizing to match the same size of the image training data is critical for developing the right comparison.

The resized image is categorized using the [attached model](https://github.com/KevinColemanInc/NSFW-FLASK/tree/master/mobilenet_v2_140_2240). This provides a float score for each of the categories: drawings, hentai, neutral, porn, and sexy. The higher the score, the more likely the image is in this category.

Once the prediction is created, we clean up after ourselves by deleting the image from the disk and return the response.

On the client, these scores need to be converted to 3 states:

1. Definitely Adult Content
2. Unknown
3. Definitely Safe Content

The unknown state will need to be human-reviewed and bucketed into one of the "definite" categories. For my first pass, I use a combination of "sexy" and "porn" scores to determine if it's "definitely adult content" and I look at the "neutral" score to know if the image is "Definitely safe Content."

### Quick Start

Self-hosting and using only takes a couple of hours since the API is so simple and Digital Ocean's App Platform allows for Heroku-like deployment.

#### Flask API

You will need to develop your client, but there are only 2 HTTP endpoints you would need to implement: POST `/predict` and GET `/health`

#### POST /predict

The service accepts a URL of an image to fetch and process. Instead of passing the image bytes directly, the URL reduces the workload on the client and avoids the overhead of base64 encoding images for the transfer ([base64 has a ~33% worse space overhead](https://lemire.me/blog/2019/01/30/what-is-the-space-overhead-of-base64-encoding/)).

```
$curl -XPOST 'http://localhost:8080/predict?url=https://www.kcoleman.me/images/hills.jpg'

{"drawings":0.11510543525218964,"hentai":0.024719053879380226,"neutral":0.803202748298645,"porn":0.0172234196215868,"sexy":0.039749305695295334}
```

#### GET /health

The health endpoint helps you monitor if the service is running without needing to process an image.

```
$ curl 'http://localhost:8080/health'

{"status":"ok"}
```

### Hosting ML microservices

#### Heroku

Unfortunately, Heroku [limits the slug size to 500MB](https://devcenter.heroku.com/changelog-items/1145). After compilation, the flask app is 635MB (due to needing to load the ML model (250MB) and PyTorch. It is impossible to host ML services on Heroku.

#### Digital Ocean

<img src="/images/digitalocean-nsfw-flask.png" alt="row of hot dogs with various sauces and condiments" title="row of hot dogs with various sauces and condiments" class="banner-img" />

The $10/mo Digital Ocean 1GB/1vCPU [App Platform](https://docs.digitalocean.com/products/app-platform/) hosts this project perfectly. The first deployment takes 20+ minutes, but it will eventually startup. There is a health check endpoint at `/health` where you can verify the service is running.

This machine takes about 600ms per request and has 2 workers, so can take about 0.8 requests per second or 72,000 images per day. Not too shabby for a $10/mo ML microservice.

Sample App config

```yaml
name: nsfw-flask
region: nyc
services:
- environment_slug: python
  github:
    branch: master
    deploy_on_push: true
    repo: KevinColemanInc/NSFW-FLASK
  health_check:
    http_path: /health
  http_port: 8080
  instance_count: 1
  instance_size_slug: basic-s
  name: nsfw-flask
  routes:
  - path: /
  run_command: gunicorn --worker-tmp-dir /dev/shm app:app
  source_dir: /
```

### Special Thanks

The flask service is a wrapper for the [GantMan/nsfw_model](https://github.com/GantMan/nsfw_model). They performed the heavy lift of developing the ML model and the prediction code.

You can play with a web host version of the model on [nsfwjs.com](https://nsfwjs.com) since we use the same model.
