import { S3Client, ListObjectsCommand } from "@aws-sdk/client-s3";
import sanitize from "sanitize-filename";

const { AWS_ENDPOINT_URL, AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_BUCKET, AWS_REGION } = process.env;

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
  const params = {
    Bucket: AWS_BUCKET,
    Prefix: `hls/`,
  };

  /* 
    /list/:imdbID/:filename
     -> 
    {
      imdbID: "",
      filename: ""
    }
  */
  const reqParams = req.originalUrl
    .split("/")
    .filter((el) => !!el)
    .reduce((acc, curV, curI) => {
      if (curI === 1) {
        acc.imdbID = curV;
      }
      if (curI === 2) {
        acc.filename = curV;
      }
      return acc;
    }, {});

  if (reqParams.imdbID) {
    params.Prefix += sanitize(reqParams.imdbID);
    if (reqParams.filename) {
      params.Prefix += "/" + decodeURIComponent(sanitize(reqParams.filename));
    }
  }

  try {
    command = new ListObjectsCommand(params);
    const response = await s3.send(command);
    if (!response.Contents) {
      throw new Error("Not found");
    }
    res.json(response.Contents);
  } catch (err) {
    console.log("Error", err);
    return res.status(404).send("Not found");
  }
};
