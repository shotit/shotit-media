// import fs from "fs-extra";
// import path from "path";
// import os from "os";
// import crypto from "crypto";
// import fetch from "node-fetch";
import child_process from "child_process";
// import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// const { AWS_ENDPOINT_URL, AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_BUCKET, AWS_REGION } = process.env;

// const opts = AWS_ENDPOINT_URL
//   ? {
//       forcePathStyle: true,
//       endpoint: AWS_ENDPOINT_URL,
//       region: AWS_REGION,
//       credentials: {
//         accessKeyId: AWS_ACCESS_KEY,
//         secretAccessKey: AWS_SECRET_KEY,
//       },
//     }
//   : {};

// const s3 = new S3Client(opts);

// let command;

export default async (filePath, start, end, key, size = "m", mute = false) => {
  /**
   *  (not work, see issue #197)
   */
  // let targetPath = "";
  // const tempPath = path.join(os.tmpdir(), crypto.createHash("md5").update(filePath).digest("hex"));
  // fs.ensureDirSync(tempPath);
  // // Remote S3 HLS
  // if (filePath.includes("index.m3u8")) {
  //   const tempIndexPath = path.join(tempPath, "index.m3u8");

  //   const response = await fetch(filePath);
  //   const downloadNecessaryHLS = (res, indexPath) => {
  //     return new Promise((resolve) => {
  //       res.body.pipe(fs.createWriteStream(indexPath));
  //       res.body.on("end", async () => {
  //         console.log(`Fetched ${indexPath}`);
  //         const cont = await fs.readFile(indexPath, { encoding: "utf8" });
  //         const lines = cont.split("\n");
  //         //Issue #186, prevent hls Error when loading first segment
  //         let tsList = ["10s_000.ts"];
  //         lines.reduce((acc, curV, curI) => {
  //           let re = /^#EXTINF:(?<num>\d+\.?\d*),/;
  //           let match = re.exec(curV);
  //           let sum = acc;
  //           if (match) {
  //             const {
  //               groups: { num },
  //             } = match;
  //             sum = acc + Number(num);
  //             if (start >= acc && start <= sum) {
  //               // allow over edge
  //               tsList.push(`10s_${(curI - 2 + "").padStart(3, "0")}.ts`);
  //               tsList.push(`10s_${(curI - 1 + "").padStart(3, "0")}.ts`);
  //               tsList.push(`10s_${(curI + "").padStart(3, "0")}.ts`);
  //               tsList.push(`10s_${(curI + 1 + "").padStart(3, "0")}.ts`);
  //               tsList.push(`10s_${(curI + 2 + "").padStart(3, "0")}.ts`);
  //             }
  //           }
  //           return sum;
  //         }, 0);
  //         let signedUrl = "";
  //         let params;
  //         for (const ts of tsList) {
  //           try {
  //             params = {
  //               Bucket: AWS_BUCKET,
  //               Key: `${key}/${ts}`,
  //             };
  //             command = new GetObjectCommand(params);
  //             signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
  //             const tsResponse = await fetch(signedUrl);
  //             const tsArrayBuffer = await tsResponse.arrayBuffer();
  //             fs.writeFileSync(path.join(tempPath, ts), Buffer.from(tsArrayBuffer));
  //           } catch (error) {
  //             console.log(error);
  //           }
  //         }
  //         await resolve("ok");
  //       });
  //     });
  //   };

  //   await downloadNecessaryHLS(response, tempIndexPath);

  //   targetPath = tempIndexPath;
  // } else {
  //   // Local Minio MP4
  //   targetPath = filePath;
  // }

  const ffmpeg = child_process.spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostats",
      "-headers",
      // If you are using remote S3, for good practice,
      // then the hls folder of your S3 service should be public
      // and require requests with a Referer header "https://shotit.github.io/"
      "Referer: https://shotit.github.io/",
      "-y",
      "-ss",
      start - 10,
      "-i",
      // targetPath,
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
  // fs.rmSync(tempPath, { recursive: true, force: true });
  return ffmpeg.stdout;
};
