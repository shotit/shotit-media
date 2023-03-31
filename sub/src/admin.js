import path from "path";
import { S3Client, ListObjectsCommand } from "@aws-sdk/client-s3";
import fs from "fs-extra";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

export default async (req, res, next) => {
  // Get object url and send it to the browser
  if (req.url.endsWith(".mp4") && req.method === "GET") {
    const key = req.path.startsWith("/") ? req.path.slice(1) : req.path;
    res.redirect(`/file/${key}`);
    return;
  }

  if (!req.url.endsWith("/")) return next();

  const videoDirPath = path.join(VIDEO_PATH, req.path);
  if (!videoDirPath.startsWith(VIDEO_PATH)) {
    return res.status(403).send("Forbidden");
  }

  const params = {
    Bucket: AWS_BUCKET,
  };

  let objectList = [];

  try {
    command = new ListObjectsCommand(params);
    const response = await s3.send(command);
    objectList = response.Contents.map((e) => e.Key);
  } catch (err) {
    console.log("Error", err);
    return res.status(404).send("Not found");
  }

  res.set(
    "Content-Security-Policy",
    [
      "default-src 'none'",
      "media-src 'self'",
      "style-src 'unsafe-inline'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'none'",
      "block-all-mixed-content",
    ].join("; ")
  );
  res.set("Content-Type", "text/html");
  res.send(
    fs
      .readFileSync(path.join(__dirname, "admin.html"), "utf8")
      .replace(
        "<!-- content -->",
        [
          `<a href="${path.join(req.baseUrl, "/")}"  onclick="return false;">..</a>`,
          ...objectList.map((e) =>
            e.endsWith(".mp4")
              ? `<a href="${e}" target="_blank">${e}</a>`
              : `<a href="#" onclick="return false;">${e}</a>`
          ),
        ].join("\n")
      )
  );
};
