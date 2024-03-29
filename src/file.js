import path from "path";
import fs from "fs-extra";
import fetch from "node-fetch";
import stream from "stream";
import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sanitize from "sanitize-filename";
import mp4ToHls from "./lib/mp4-to-hls.js";

const {
  AWS_ENDPOINT_URL,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  AWS_BUCKET,
  AWS_REGION,
  VIDEO_PATH = "/mnt",
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

function error500(e, res) {
  console.log(e);
  res.status(500).send("Internal Server Error");
}

export default async (req, res) => {
  const videoFilePath = path.join(
    VIDEO_PATH,
    sanitize(req.params.imdbID),
    sanitize(req.params.filename)
  );

  const params = {
    Bucket: AWS_BUCKET,
    Key: `mp4/${sanitize(req.params.imdbID)}/${sanitize(req.params.filename)}`,
  };

  if (req.method === "GET") {
    // Verify object existence
    try {
      command = new HeadObjectCommand(params);
      await s3.send(command);
    } catch (error) {
      console.log(error);
      res.status(404).send(`Not found`);
      return;
    }

    command = new GetObjectCommand(params);
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
    const response = await fetch(signedUrl, {
      method: "GET",
      headers: { "Content-Type": "video/mp4" },
    }).catch((e) => {
      error500(e, res);
    });
    if (!response.ok) error500("Internal Server Error", res);
    res.setHeader("Content-Type", "video/mp4");
    response.body.pipe(res);
  } else if (req.method === "PUT") {
    console.log(`Uploading ${videoFilePath}`);
    const passThroughStream = new stream.PassThrough();
    const objectUploadParams = Object.assign(params, { Body: passThroughStream });
    try {
      const parallelUploads3 = new Upload({
        client: s3,
        // tags: [...], // optional tags
        queueSize: 4, // optional concurrency configuration
        leavePartsOnError: false, // optional manually handle dropped parts
        params: objectUploadParams,
      });

      req.pipe(passThroughStream);

      parallelUploads3.on("httpUploadProgress", (progress) => {
        console.log(progress);
      });

      await parallelUploads3.done();
      console.log(`Uploaded(mp4) to ${videoFilePath}`);

      // Need to fetch the mp4 file back to convert it to hls files in docker volume,
      // then upload
      console.log(
        `Uploading to ${path.join(
          VIDEO_PATH,
          "hls",
          sanitize(req.params.imdbID),
          sanitize(req.params.filename)
        )}`
      );

      command = new GetObjectCommand(params);
      const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });

      const hlsDir = mp4ToHls(
        signedUrl,
        path.join(VIDEO_PATH, "hls"),
        sanitize(req.params.imdbID),
        sanitize(req.params.filename)
      );

      const files = fs.readdirSync(hlsDir);

      for (const file of files) {
        try {
          const fileBuffer = fs.createReadStream(path.join(hlsDir, file));
          const passThroughStream = new stream.PassThrough();

          const fileUploadParams = Object.assign(params, {
            Key: `hls/${sanitize(req.params.imdbID)}/${sanitize(req.params.filename)}/${sanitize(
              file
            )}`,
            Body: passThroughStream,
          });

          const parallelUploads3 = new Upload({
            client: s3,
            // tags: [...], // optional tags
            queueSize: 4, // optional concurrency configuration
            leavePartsOnError: false, // optional manually handle dropped parts
            params: fileUploadParams,
          });

          fileBuffer.pipe(passThroughStream);

          parallelUploads3.on("httpUploadProgress", (progress) => {
            console.log(progress);
          });

          await parallelUploads3.done();
        } catch (e) {
          error500(e, res);
        }
      }

      console.log(`Uploaded(hls) to ${videoFilePath}`);

      fs.rmSync(hlsDir, { recursive: true, force: true });

      res.status(204).send("Uploaded");
    } catch (e) {
      error500(e, res);
    }
  } else if (req.method === "DELETE") {
    // Verify object existence
    try {
      command = new HeadObjectCommand(params);
      await s3.send(command);
    } catch (error) {
      res.status(404).send(`Not found`);
      return;
    }

    console.log(`Deleting(mp4) ${videoFilePath}`);
    command = new DeleteObjectCommand(params);
    await s3.send(command).catch((e) => {
      error500(e, res);
    });
    console.log(`Deleted(mp4) ${videoFilePath}`);

    console.log(`Deleting(hls) ${videoFilePath}`);
    let response = {};
    try {
      const params = {
        Bucket: AWS_BUCKET,
        Prefix: `hls/${req.params.imdbID}/${sanitize(req.params.filename)}`,
      };
      command = new ListObjectsCommand(params);
      response = await s3.send(command);
      for (const item of response.Contents) {
        const params = {
          Bucket: AWS_BUCKET,
          Key: item.Key,
        };
        command = new DeleteObjectCommand(params);
        await s3.send(command).catch((e) => {
          error500(e, res);
        });
      }
      console.log(`Deleted(hls) ${videoFilePath}`);
    } catch (err) {
      console.log("Error", err);
      error500(err, res);
    }
    res.sendStatus(204);
  }
};
