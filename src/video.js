import path from "path";
import fs from "fs-extra";
import os from "os";
import child_process from "child_process";

import detectScene from "./lib/detect-scene.js";

const { VIDEO_PATH } = process.env;

const generateVideoPreview = (filePath, start, end, size = "m", mute = false) => {
  const tempPath = path.join(os.tmpdir(), `videoPreview${process.hrtime().join("")}.mp4`);
  child_process.spawnSync(
    "ffmpeg",
    [
      "-y",
      "-ss",
      start,
      "-i",
      filePath,
      "-t",
      end - start,
      mute ? "-an" : "-y",
      "-vf",
      `scale=${{ l: 640, m: 320, s: 160 }[size]}:-2`,
      "-crf",
      "23",
      "-preset",
      "faster",
      tempPath,
    ],
    { encoding: "utf-8" }
  );
  const videoBuffer = fs.readFileSync(tempPath);
  fs.removeSync(tempPath);
  return videoBuffer;
};

export default async (req, res) => {
  const t = parseFloat(req.query.t);
  if (isNaN(t) || t < 0) {
    res.status(400).send("Bad Request. Invalid param: t");
    return;
  }
  const videoFilePath = path.join(VIDEO_PATH, req.params.anilistID, req.params.filename);
  if (!videoFilePath.startsWith(VIDEO_PATH)) {
    res.status(403).send("403 Forbidden");
    return;
  }
  if (!fs.existsSync(videoFilePath)) {
    res.status(404).send("Not found");
    return;
  }
  const size = req.query.size || "m";
  if (!["l", "m", "s"].includes(size)) {
    res.status(400).send("Bad Request. Invalid param: size");
    return;
  }
  try {
    const scene = await detectScene(videoFilePath, t);
    if (scene === null) {
      res.status(500).send("Internal Server Error");
      return;
    }
    const video = generateVideoPreview(
      videoFilePath,
      scene.start,
      scene.end,
      size,
      "mute" in req.query
    );
    res.set("Content-Type", "video/mp4");
    res.set("X-Trace-Start", scene.start);
    res.set("X-Trace-End", scene.end);
    res.set("X-Trace-Duration", scene.duration);
    res.send(video);
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
};
