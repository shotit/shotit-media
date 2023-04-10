import os from "os";
import path from "path";
import child_process from "child_process";
import fs from "fs-extra";
import Canvas from "canvas";
import getVideoDuration from "./get-video-duration.js";

export default async (filePath, t, minDuration) => {
  if (t < 0) {
    return null;
  }

  const videoDuration = await getVideoDuration(filePath);
  if (videoDuration === null || t > videoDuration) {
    return null;
  }

  const tBefore = 5;
  const tAfter = 5;
  let trimStart = t - tBefore;
  let trimEnd = t + tAfter;
  if (t - tBefore < 0) {
    trimStart = 0;
    trimEnd = tBefore + tAfter;
  }
  if (t + tAfter > videoDuration) {
    trimStart = videoDuration - tBefore - tAfter;
    trimEnd = videoDuration;
  }
  const fps = 12;
  const width = 32;
  const height = 18;

  const tempPath = path.join(os.tmpdir(), `videoPreview${process.hrtime().join("")}`);
  fs.removeSync(tempPath);
  fs.ensureDirSync(tempPath);
  const ffmpeg = child_process.spawnSync(
    "ffmpeg",
    [
      "-headers",
      "Referer: https://shotit.github.io/",
      "-y",
      "-ss",
      trimStart - 10,
      "-i",
      filePath,
      "-ss",
      "10",
      "-t",
      trimEnd - trimStart,
      "-an",
      "-vf",
      `fps=${fps},scale=${width}:${height}`,
      `${tempPath}/%04d.jpg`,
    ],
    { encoding: "utf-8" }
  );
  // console.log(ffmpeg.stderr);

  const imageDataList = await Promise.all(
    fs.readdirSync(tempPath).map(
      (file) =>
        new Promise(async (resolve) => {
          const canvas = Canvas.createCanvas(width, height);
          const ctx = canvas.getContext("2d");
          const image = await Canvas.loadImage(path.join(tempPath, file));
          ctx.drawImage(image, 0, 0, width, height);
          resolve(ctx.getImageData(0, 0, width, height).data);
        })
    )
  );
  fs.removeSync(tempPath);

  const getImageDiff = (a, b) => {
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff += Math.abs(a[i] - b[i]);
    }
    return Math.floor(diff / 1000);
  };

  const frameInfo = imageDataList
    .map((curr, index, array) => getImageDiff(curr, index ? array[index - 1] : curr))
    .map((curr, index) => ({
      id: index,
      diff: curr,
    }));

  const threshold = 50;
  let centerFrameID = Math.floor((t - trimStart) * fps);
  if (centerFrameID > frameInfo.length - 1) {
    centerFrameID = frameInfo.length - 1;
  }
  const minFrames = (minDuration / 2) * fps;

  let startFrameID = centerFrameID;
  let endFrameID = centerFrameID;
  for (let i = centerFrameID; i >= 0; i--) {
    // compare with prev frame
    if (i === 0 || (frameInfo[i].diff > threshold && centerFrameID - i > minFrames)) {
      startFrameID = i;
      break;
    }
  }

  for (let i = centerFrameID; i < frameInfo.length; i++) {
    // compare with next frame
    if (
      i + 1 === frameInfo.length ||
      (frameInfo[i + 1].diff > threshold && i - centerFrameID > minFrames)
    ) {
      endFrameID = i;
      break;
    }
  }

  // debug use
  // frameInfo[centerFrameID] = Object.assign(frameInfo[centerFrameID], {center:true});
  // frameInfo[startFrameID] = Object.assign(frameInfo[startFrameID], {start:true});
  // frameInfo[endFrameID] = Object.assign(frameInfo[endFrameID], {end:true});
  // console.log(frameInfo);
  const sceneTrimStart = trimStart + startFrameID / fps;
  const sceneTrimEnd = trimStart + endFrameID / fps;

  return {
    start: sceneTrimStart,
    end: sceneTrimEnd,
    duration: videoDuration,
  };
};
