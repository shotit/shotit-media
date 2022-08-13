import path from "path";
import { S3Client, ListObjectsCommand } from "@aws-sdk/client-s3";

const {
  AWS_ENDPOINT_URL,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  AWS_BUCKET,
  VIDEO_PATH = "/mnt",
} = process.env;

const opts = AWS_ENDPOINT_URL
  ? {
      endpoint: AWS_ENDPOINT_URL,
      signatureVersion: "v4",
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      },
    }
  : {};

const s3 = new S3Client(opts);

let command;

export default async (req, res) => {
  const videoDirPath = path.join(VIDEO_PATH, req.path);
  if (!videoDirPath.startsWith(VIDEO_PATH)) {
    return res.status(403).send("Forbidden");
  }
  const params = {
    Bucket: AWS_BUCKET,
    Key: `${req.params.anilistID}/${req.params.filename}`,
  };

  try {
    command = new ListObjectsCommand(params);
    const response = await s3.send(command);
    res.json(response.Contents);
  } catch (err) {
    console.log("Error", err);
    return res.status(404).send("Not found");
  }
};
