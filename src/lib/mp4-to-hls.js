import path from "path";
import fs from "fs-extra";
import os from "os";
import child_process from "child_process";

/**
 *
 * First, convert mp4 to ts as a whole
 *
 * ffmpeg -y -i index.mp4  -vcodec copy -acodec copy -vbsf h264_mp4toannexb index.ts
 *
 * Then, split ts
 *
 * ffmpeg -i index.ts -c copy -map 0 -f segment -segment_list index.m3u8 -segment_time 10 10s_%3d.ts
 *
 * @param {String} filePath
 * @param {String} tempDir
 * @param {String} anilistID
 * @param {String} fileName
 * @returns {String | null}
 */
export default (filePath, tempDir = "", anilistID, fileName) => {
  // const anilistID = filePath.split(path.sep).slice(-2)[0];
  // const fileName = filePath.split(path.sep).slice(-2)[1];

  const tempPath = path.join(tempDir || os.tmpdir(), anilistID, fileName);
  fs.ensureDirSync(tempPath);

  const tempIndexTsPath = path.join(tempPath, "index.ts");
  const temp10sTsPath = path.join(tempPath, "10s_%3d.ts");

  let stdLog = child_process.spawnSync(
    "ffmpeg",
    [
      "-i",
      filePath,
      "-vcodec",
      "copy",
      "-acodec",
      "copy",
      "-vbsf",
      "h264_mp4toannexb",
      tempIndexTsPath,
    ],
    { encoding: "utf-8" }
  ).stdout;

  console.log(`wirte file ${tempIndexTsPath}`);

  const tempIndexM3u8Path = path.join(tempPath, "index.m3u8");

  if (!stdLog) {
    stdLog = child_process.spawnSync(
      "ffmpeg",
      [
        "-i",
        tempIndexTsPath,
        "-c",
        "copy",
        "-map",
        "0",
        "-f",
        "segment",
        "-segment_list",
        tempIndexM3u8Path,
        "-segment_time",
        "10",
        temp10sTsPath,
      ],
      { encoding: "utf-8" }
    ).stdout;
    !stdLog && console.log(`wirte file ${tempIndexM3u8Path} & ${temp10sTsPath}`);

    if (fs.existsSync(tempIndexTsPath)) {
      fs.unlinkSync(tempIndexTsPath);
    }
    console.log(`Remove file ${tempIndexTsPath}`);

    return tempPath;
  }

  return null;
};
