# Shotit-media

[![License](https://img.shields.io/github/license/shotit/shotit-media.svg?style=flat-square)](https://github.com/shotit/shotit-media/blob/main/LICENSE)
[![Coverage](https://img.shields.io/codecov/c/github/shotit/shotit-media/main.svg?style=flat)](https://app.codecov.io/gh/shotit/shotit-media/branch/main)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/shotit/shotit-media/docker-image.yml?branch=main&style=flat-square)](https://github.com/shotit/shotit-media/actions)
[![GitHub release](https://img.shields.io/github/release/shotit/shotit-media.svg)](https://github.com/shotit/shotit-media/releases/latest)
[![Docker](https://img.shields.io/docker/pulls/lesliewong007/shotit-media?style=flat-square)](https://hub.docker.com/r/lesliewong007/shotit-media)
[![Docker Image Size](https://img.shields.io/docker/image-size/lesliewong007/shotit-media/v0.9.6?style=flat-square)](https://hub.docker.com/r/lesliewong007/shotit-media)

### Media broker for serving video preview for [shotit](https://github.com/shotit/shotit)

This server uses a "video scene cutter" which automatically detect timestamp boundaries of a shot, and then trim the shot out without leaking / exposing other frames that belongs to previous / next scenes.

#### Background of this project

When search result from shotit returns a TV & film, episode and a timecode, it can generate a video preview for the scene at that time code.

Query image:

![](https://images.plurk.com/3F4Mg666qw78rImF7DR2SG.jpg)

Search result: `Shelter, episode 1, timecode: 00:00:51.83`

Video Preview at time `00:00:51.83`

|            Fixed offset without shotit-media             |              Auto detect with shotit-media               |
| :------------------------------------------------------: | :------------------------------------------------------: |
| ![](https://images.plurk.com/7lURadxyYVrvPl52M7mm3G.gif) | ![](https://images.plurk.com/2mcJxwtMJFSVhLQ8XDUYI3.gif) |
|            00:50.93 (-0.9) to 00:53.93 (+2.1)            |              00:49.22 to 00:51.30 (dynamic)              |

By using first / last frames from the fixed offset preview, user may be able to use that to search again and reveal previous/next scene of the original video. By repeating this process, users may eventually read the whole video until the rate limit/search quota used up.

With the video preview generated by auto detect method, searching any frame form the preview would only results the same video preview. This prevents leaking the previous/next scene.

### How does it work

To be completed

![](https://images.plurk.com/2NDcHsv4PFLWX5q64zHts7.jpg)

### Getting Started

```bash
> git clone https://github.com/shotit/shotit-media.git
>
> cd shotit-media
>
> # Copy .env.example to .env
> touch .env.example .env
>
> # Launch shotit-media server as well as its dependent services
> docker-compose up -d
```

Since some of the following endpoints are secured by the `TRACE_API_SECRET` environment variable, please put `x-trace-secret` in HTTP header when sending requests.

#### Verify status

```
GET http://127.0.0.1:3000/ -> OK
```

#### List files

```shell
# Need x-trace-secret header
GET http://127.0.0.1:3000/list/
```

#### Video URL

```shell
# Need x-trace-secret header
GET http://127.0.0.1:3000/file/tv_film_title/episode_number.mp4
```

For this URL endpoint, use HTTP Method PUT, DELETE to upload and delete files.

#### Video Preview URL

```
GET http://127.0.0.1:3000/video/tv_film_title/episode_number.mp4?t=87
```

You can use the `&size=` param to specify preview size (l: 640, m: 320, s: 160)

```
GET http://127.0.0.1:3000/video/tv_film_title/episode_number.mp4?t=87&size=l
```

You can use the `&mute` param to generate a muted video (like GIF)

```
GET http://127.0.0.1:3000/video/tv_film_title/episode_number.mp4?t=87&size=l&mute
```

#### Image Preview URL

```
GET http://127.0.0.1:3000/image/tv_film_title/episode_number.mp4?t=87
```

You can use the `&size=` param to specify preview size (l: 640, m: 320, s: 160)

```
GET http://127.0.0.1:3000/image/tv_film_title/episode_number.mp4?t=87&size=l
```

### Environment variables

```
VIDEO_PATH=         # e.g. /mnt/data/imdb/
SERVER_PORT=        # e.g. 3001
SERVER_ADDR=        # e.g. 127.0.0.1 or 0.0.0.0
TRACE_MEDIA_SALT=   # define any random string, or leave blank to disable secure token
TRACE_API_SECRET=   # same as TRACE_API_SECRET in shotit-api's .env, or leave blank to disable auth(Not recommended)
AWS_BUCKET=         # e.g. shotit-media
AWS_ENDPOINT_URL=   # e.g. http://127.0.0.1:9000
AWS_REGION=         # e.g. us-east-1
AWS_ACCESS_KEY=     # e.g. minioadmin
AWS_SECRET_KEY=     # e.g. minioadmin
```

### Local Development Guide

```shell
git clone https://github.com/shotit/shotit-media.git
cd shotit-media
yarn install
```

### Configuration

- Copy `.env.example` to `.env`
- Edit `.env` as appropriate for your setup, as is for the first time.

### Dependent Services

- minio
- etcd

Comment out the `media` service at `docker-compose.yml`, then:

```
docker-compose up -d
```

### Start Development

You can use pm2 to run shotit-media server in background in cluster mode.

Use below commands to start / restart / stop server.

```
yarn start
yarn stop
yarn reload
yarn restart
yarn delete
yarn logs
```

To change the number of nodejs instances, edit ecosystem.config.json
