import "dotenv/config.js";
import { performance } from "perf_hooks";
import express from "express";
import rateLimit from "express-rate-limit";
import list from "./list.js";
import admin from "./admin.js";
import video from "./video.js";
import image from "./image.js";
import file from "./file.js";
import checkSecret from "./check-secret.js";
import checkIP from "./check-ip.js";

const { VIDEO_PATH = "/mnt/" } = process.env;

const app = express();

app.disable("x-powered-by");

app.set("trust proxy", 1);

app.use((req, res, next) => {
  const startTime = performance.now();
  console.log(req.method, "=>", new Date().toISOString(), req.ip, req.path);
  res.on("finish", () => {
    console.log(
      "<=",
      new Date().toISOString(),
      req.ip,
      req.path,
      res.statusCode,
      `${(performance.now() - startTime).toFixed(0)}ms`
    );
  });
  next();
});

app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Referrer-Policy", "no-referrer");
  res.set("X-Content-Type-Options", "nosniff");
  res.set(
    "Content-Security-Policy",
    [
      "default-src 'none'",
      "media-src 'self'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'none'",
      "block-all-mixed-content",
    ].join("; ")
  );
  next();
});

app.use(
  rateLimit({
    max: 30, // 30 requests per IP address (per node.js process)
    windowMs: 60 * 1000, // per 1 minute
  })
);

app.all("/", (req, res) => res.send("ok"));

app.get("/video/:anilistID/:filename", video);

app.get("/image/:anilistID/:filename", image);

app.use("/check-secret", checkSecret);

app.use("/file/:anilistID/:filename", checkSecret, file);

app.use("/list", checkSecret, list);

app.use("/check-ip", checkIP);

app.use("/admin", checkIP, admin);

app.use("/admin", checkIP, express.static(VIDEO_PATH));

export default app;
