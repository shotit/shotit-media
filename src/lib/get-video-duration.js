import path from "path";
import os from "os";
import fs from "fs-extra";
import child_process from "child_process";
import fetch from "node-fetch";

export default async (filePath) => {
  if (filePath.includes("/index.m3u8")) {
    // hls version
    const tempPath = path.join(os.tmpdir(), `hls${process.hrtime().join("")}`);
    fs.removeSync(tempPath);
    fs.ensureDirSync(tempPath);
    const videoFilePath = `${tempPath}/index.m3u8`;
    const response = await fetch(filePath);
    const getVideoDuration = (res, path) => {
      return new Promise((resolve) => {
        res.body.pipe(fs.createWriteStream(path));
        res.body.on("end", async () => {
          console.log(`Fetched ${path}`);
          const cont = await fs.readFile(path, { encoding: "utf8" });
          const lines = cont.split("\n");
          const result = lines.reduce((acc, cur) => {
            let re = /^#EXTINF:(?<num>\d+\.?\d*),/;
            let match = re.exec(cur);
            if (match) {
              const {
                groups: { num },
              } = match;
              acc += Number(num);
            }
            return acc;
          }, 0);
          resolve(result);
        });
      });
    };
    const result = await getVideoDuration(response, videoFilePath);
    fs.removeSync(tempPath);
    return result ?? null;
  } else {
    // mp4 version
    const stdLog = child_process.spawnSync(
      "ffprobe",
      [
        "-headers",
        // If you are using remote S3, for good practice,
        // then the hls folder of your S3 service should be public
        // and require requests with a Referer header "https://shotit.github.io/"
        "Referer: https://shotit.github.io/",
        "-i",
        filePath,
        "-show_entries",
        "format=duration",
        "-v",
        "quiet",
      ],
      { encoding: "utf-8" }
    ).stdout;
    const result = /duration=((\d|\.)+)/.exec(stdLog);
    if (result === null) {
      return null;
    }
    return parseFloat(result[1]);
  }
};
