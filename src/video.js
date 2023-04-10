import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import child_process from "child_process";

import detectScene from "./lib/detect-scene.js";

const {
  AWS_ENDPOINT_URL,
  // AWS_HLS_URL,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  AWS_BUCKET,
  AWS_REGION,
  TRACE_MEDIA_SALT,
} = process.env;

const opts = AWS_ENDPOINT_URL
  ? {
      forcePathStyle: true,
      endpoint: AWS_ENDPOINT_URL,
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      },
    }
  : {};

const s3 = new S3Client(opts);

let command;

const generateVideoPreview = (filePath, start, end, size = "m", mute = false) => {
  const ffmpeg = child_process.spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostats",
      "-headers",
      "Referer: https://shotit.github.io/",
      "-y",
      "-ss",
      start - 10,
      "-i",
      filePath,
      "-ss",
      "10",
      "-t",
      end - start,
      mute ? "-an" : "-y",
      "-map",
      "0:v:0",
      "-map",
      "0:a:0",
      "-vf",
      `scale=${{ l: 640, m: 320, s: 160 }[size]}:-2`,
      "-c:v",
      "libx264",
      "-crf",
      "23",
      "-profile:v",
      "high",
      "-preset",
      "faster",
      "-r",
      "24000/1001",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-max_muxing_queue_size",
      "1024",
      "-movflags",
      "empty_moov",
      "-map_metadata",
      "-1",
      "-map_chapters",
      "-1",
      "-f",
      "mp4",
      "-",
    ],
    { maxBuffer: 1024 * 1024 * 100 }
  );
  if (ffmpeg.stderr.length) {
    console.log(ffmpeg.stderr.toString());
  }
  return ffmpeg.stdout;
};

export default async (req, res) => {
  if (
    TRACE_MEDIA_SALT &&
    req.query.token !==
      crypto
        .createHash("sha1")
        .update(
          [
            req.params.imdbID,
            req.params.filename,
            req.query.t,
            req.query.now,
            TRACE_MEDIA_SALT,
          ].join("")
        )
        .digest("base64")
        .replace(/[^0-9A-Za-z]/g, "")
  ) {
    return res.status(403).send("Forbidden");
  }
  if (((Date.now() / 1000) | 0) - Number(req.query.now) > 300) return res.status(410).send("Gone");
  const t = parseFloat(req.query.t);
  if (isNaN(t) || t < 0) {
    return res.status(400).send("Bad Request. Invalid param: t");
  }

  const params = {
    Bucket: AWS_BUCKET,
    // Key: `${req.params.imdbID}/${req.params.filename}`,
    Key: `hls/${req.params.imdbID}/${decodeURIComponent(req.params.filename)}/index.m3u8`,
  };
  try {
    command = new HeadObjectCommand(params);
    await s3.send(command);
  } catch (error) {
    res.status(404).send("Not found");
    return;
  }
  const size = req.query.size || "m";
  if (!["l", "m", "s"].includes(size)) {
    return res.status(400).send("Bad Request. Invalid param: size");
  }
  const minDuration = Number(req.query.minDuration) || 0.25;
  try {
    ///////////////////////////
    //      mp4 version:     //
    // (Note: now handing hls//
    // files because of the  //
    // param 'hls' key above //
    // and it works.) :)     //
    ///////////////////////////

    command = new GetObjectCommand(params);
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
    const scene = await detectScene(signedUrl, t, minDuration > 2 ? 2 : minDuration);
    if (scene === null) {
      return res.status(503).send("Service Unavailable");
    }
    const video = generateVideoPreview(
      signedUrl,
      scene.start,
      scene.end,
      size,
      "mute" in req.query
    );
    res.set("Content-Type", "video/mp4");
    res.set("x-video-start", scene.start);
    res.set("x-video-end", scene.end);
    res.set("x-video-duration", scene.duration);
    res.set("Access-Control-Expose-Headers", "x-video-start, x-video-end, x-video-duration");
    res.send(video);

    //////////////////////////
    //       HLS version:   //
    //////////////////////////

    // // Note: AWS S3 prefix authentication and CORS config
    // const targetHlsUrl = `${AWS_HLS_URL}/${params.Key}`;
    // const scene = await detectScene(targetHlsUrl, t, minDuration > 2 ? 2 : minDuration);
    // if (scene === null) {
    //   return res.status(500).send("Internal Server Error");
    // }
    // const video = generateVideoPreview(
    //   targetHlsUrl,
    //   scene.start,
    //   scene.end,
    //   size,
    //   "mute" in req.query
    // );
    // res.set("Content-Type", "video/mp4");
    // res.set("x-video-start", scene.start);
    // res.set("x-video-end", scene.end);
    // res.set("x-video-duration", scene.duration);
    // res.set("Access-Control-Expose-Headers", "x-video-start, x-video-end, x-video-duration");
    // res.send(video);
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
};
