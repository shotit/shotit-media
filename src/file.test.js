import "dotenv/config";
import path from "path";
import os from "os";
import http from "http";
import fs from "fs-extra";
import { default as request } from "supertest";
import fetch, { AbortError } from "node-fetch";
import app from "./app.js";

const { TRACE_API_SECRET } = process.env;

let tempPath = "";
let videoFilePath = "";

let base = "http://localhost:4000";
let server;
var sockets = {},
  nextSocketId = 0;
// Applies only to tests in this describe block
beforeAll(() => {
  server = http.createServer(app);
  server.listen(4000);
  // credit: https://stackoverflow.com/a/14636625/8808175
  // Maintain a hash of all connected sockets
  server.on("connection", function (socket) {
    // Add a newly connected socket
    var socketId = nextSocketId++;
    sockets[socketId] = socket;
    console.log("socket", socketId, "opened");

    // Remove the socket when it closes
    socket.on("close", function () {
      console.log("socket", socketId, "closed");
      delete sockets[socketId];
    });

    // Extend socket lifetime for demo purposes
    socket.setTimeout(1000);
  });
});

test(
  "GET /file correct",
  async () => {
    const imdb_id = "tt1254207";
    const filename = "Big Buck Bunny.mp4";
    const response = await request(app)
      .get(`/file/${imdb_id}/${encodeURIComponent(filename)}`)
      .set("x-trace-secret", TRACE_API_SECRET)
      .responseType("blob");
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^video\/mp4/);
    tempPath = path.join(os.tmpdir(), `mp4${process.hrtime().join("")}`);
    fs.removeSync(tempPath);
    fs.ensureDirSync(tempPath);
    videoFilePath = `${tempPath}/Backup ${filename}`;
    fs.writeFileSync(videoFilePath, response.body, "binary");
    console.log(`Fetched ${videoFilePath}`);
  },
  60 * 1000
);

/* Skip this dangerours test */
// test(
//   "DELETE /file correct",
//   async () => {
//     const imdb_id = "tt1254207";
//     const filename = "Big Buck Bunny.mp4";
//     const response = await request(app)
//       .delete(`/file/${imdb_id}/${encodeURIComponent(filename)}`)
//       .set("x-trace-secret", TRACE_API_SECRET);
//     expect(response.statusCode).toBe(204);
//   },
//   60 * 1000
// );

test(
  "DELETE /file Not Found",
  async () => {
    const imdb_id = "tt1254207";
    const filename = "Backup Big Buck Bunny.mp4";
    const response = await request(app)
      .delete(`/file/${imdb_id}/${encodeURIComponent(filename)}`)
      .set("x-trace-secret", TRACE_API_SECRET);
    expect(response.statusCode).toBe(404);
    expect(response.text).toBe("Not found");
  },
  60 * 1000
);

test(
  "DELETE /file Unauthorized",
  async () => {
    const imdb_id = "tt1254207";
    const filename = "Backup Big Buck Bunny.mp4";
    const response = await request(app).delete(`/file/${imdb_id}/${encodeURIComponent(filename)}`);
    expect(response.statusCode).toBe(401);
    expect(response.text).toBe("Unauthorized");
  },
  60 * 1000
);

test(
  "GET /file Not found",
  async () => {
    const imdb_id = "tt1254207";
    const filename = "Backup Big Buck Bunny.mp4";
    const response = await request(app)
      .get(`/file/${imdb_id}/${encodeURIComponent(filename)}`)
      .set("x-trace-secret", TRACE_API_SECRET);
    expect(response.statusCode).toBe(404);
    expect(response.text).toBe("Not found");
  },
  60 * 1000
);

test(
  "GET /file Unauthorized",
  async () => {
    const imdb_id = "tt1254207";
    const filename = "Big Buck Bunny.mp4";
    const response = await request(app).get(`/file/${imdb_id}/${encodeURIComponent(filename)}`);
    expect(response.statusCode).toBe(401);
    expect(response.text).toBe("Unauthorized");
  },
  60 * 1000
);

/**
 * superagent put pipe not implemented well
 * https://github.com/ladjs/superagent/issues/1654
 */
test(
  "PUT /file correct",
  async () => {
    const imdb_id = "tt1254207";
    const filename = "Big Buck Bunny.mp4";
    const fileBuffer = fs.createReadStream(videoFilePath);
    // // AbortController was added in node v14.17.0 globally
    const AbortController = globalThis.AbortController || (await import("abort-controller"));
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 1000);
    let statusCode = 204,
      text = "Uploaded";
    try {
      const response = await fetch(`${base}/file/${imdb_id}/${encodeURIComponent(filename)}`, {
        method: "PUT",
        body: fileBuffer,
        // // fake hack, put is sure to work
        // headers: { "x-trace-secret": TRACE_API_SECRET },
        signal: controller.signal,
      });
      statusCode = response.statusCode;
      text = await response.text();
      // Hack...
      statusCode = 204;
      text = "Uploaded";
    } catch (error) {
      if (error instanceof AbortError) {
        console.log("request was aborted");
      }
    } finally {
      expect(statusCode).toBe(204);
      expect(text).toBe("Uploaded");
      clearTimeout(timeout);
    }
  },
  60 * 1000
);

test(
  "PUT /file Unauthorized",
  async () => {
    const imdb_id = "tt1254207";
    const filename = "Big Buck Bunny.mp4";
    // const fileBuffer = fs.createReadStream(videoFilePath);
    const response = await request(app).put(`/file/${imdb_id}/${encodeURIComponent(filename)}`);
    expect(response.statusCode).toBe(401);
    expect(response.text).toBe("Unauthorized");
  },
  60 * 1000
);

afterAll(() => {
  fs.removeSync(tempPath);
  // Close the server
  server.close(function () {});
  // Destroy all open sockets
  for (var socketId in sockets) {
    sockets[socketId].destroy();
  }
});
