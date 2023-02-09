import path from "path";
import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
// import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import child_process from "child_process";

const {
  AWS_ENDPOINT_URL,
  AWS_HLS_URL,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  AWS_BUCKET,
  AWS_REGION,
  VIDEO_PATH = "/mnt/",
  TRACE_MEDIA_SALT,
} = process.env;

const opts = AWS_ENDPOINT_URL
  ? {
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

const generateImagePreview = (filePath, t, size = "m") => {
  const ffmpeg = child_process.spawnSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostats",
    "-headers",
    "Referer: https://ultraman-shot.cc/",
    "-y",
    "-ss",
    t - 10,
    "-i",
    filePath,
    "-ss",
    "10",
    "-vf",
    `scale=${{ l: 640, m: 320, s: 160 }[size]}:-2`,
    "-c:v",
    "mjpeg",
    "-vframes",
    "1",
    "-f",
    "image2pipe",
    "pipe:1",
  ]);
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
            req.params.anilistID,
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
  const videoFilePath = path.join(
    VIDEO_PATH,
    req.params.anilistID,
    req.params.filename.replace(/\.jpg$/, "")
  );
  if (!videoFilePath.startsWith(VIDEO_PATH)) {
    return res.status(403).send("Forbidden");
  }

  const params = {
    Bucket: AWS_BUCKET,
    // Key: `${req.params.anilistID}/${req.params.filename.replace(/\.jpg$/, "")}`,
    Key: `hls/${req.params.anilistID}/${req.params.filename.replace(/\.jpg$/, "")}/index.m3u8`,
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
  try {
    ///////////////////////////
    // Previous mp4 version: //
    // (Note: now handing hls//
    // files because of the  //
    // param 'hls' key above //
    // and it works.) :)     //
    ///////////////////////////

    command = new GetObjectCommand(params);
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });

    const image = generateImagePreview(signedUrl, t, size);
    res.set("Content-Type", "image/jpg");
    res.send(image);

    //////////////////////////
    // Current HLS version://
    //////////////////////////

    // // Note: AWS S3 prefix authentication and CORS config
    // const targetHlsUrl = `${AWS_HLS_URL}/${params.Key}`;
    // const image = generateImagePreview(targetHlsUrl, t, size);
    // res.set("Content-Type", "image/jpg");
    // res.send(image);
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
};
