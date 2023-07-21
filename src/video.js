import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

import detectScene from "./lib/detect-scene.js";
import generateVideoPreview from "./lib/generate-video-preview.js";

const {
  AWS_ENDPOINT_URL,
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
    Key: AWS_ENDPOINT_URL.startsWith("http://minio")
      ? // Local Minio, directly mp4 files
        `mp4/${req.params.imdbID}/${req.params.filename}`
      : // Remote S3, fetch hls files to reduce network IO
        `hls/${req.params.imdbID}/${req.params.filename}/index.m3u8`,
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
    command = new GetObjectCommand(params);
    const mp4SignedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
    const scene = await detectScene(mp4SignedUrl, t, minDuration > 2 ? 2 : minDuration);
    if (scene === null) {
      return res.status(503).send("Service Unavailable");
    }
    command = new GetObjectCommand(params);
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
    const video = await generateVideoPreview(
      signedUrl,
      scene.start,
      scene.end,
      `hls/${req.params.imdbID}/${req.params.filename}`,
      size,
      "mute" in req.query
    );
    res.set("Content-Type", "video/mp4");
    res.set("x-video-start", scene.start);
    res.set("x-video-end", scene.end);
    res.set("x-video-duration", scene.duration);
    res.set("Access-Control-Expose-Headers", "x-video-start, x-video-end, x-video-duration");
    res.send(video);
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
};
