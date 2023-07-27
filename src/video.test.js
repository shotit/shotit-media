import "dotenv/config";
import crypto from "crypto";
import { default as request } from "supertest";
import app from "./app.js";

const { TRACE_MEDIA_SALT } = process.env;

test(
  "GET /video correct",
  async () => {
    const to = 10,
      from = 10;
    const window = 60 * 60; // 3600 seconds
    const now = ((Date.now() / 1000 / window) | 0) * window + window;
    const mid = from + (to - from) / 2;
    const imdb_id = "tt1254207";
    const filename = "Big Buck Bunny.mp4";
    const videoToken = crypto
      .createHash("sha1")
      .update([imdb_id, filename, mid, now, TRACE_MEDIA_SALT].join(""))
      .digest("base64")
      .replace(/[^0-9A-Za-z]/g, "");
    const response = await request(app).get(
      `/video/${imdb_id}/${encodeURIComponent(filename)}?${[
        `t=${mid}`,
        `now=${now}`,
        `token=${videoToken}`,
      ].join("&")}`
    );
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^video\/mp4/);
    expect(response.headers["x-video-duration"]).toBe("596.500001");
  },
  60 * 1000
);

test(
  "GET /video Forbidden",
  async () => {
    const to = 10,
      from = 10;
    const window = 60 * 60; // 3600 seconds
    const now = ((Date.now() / 1000 / window) | 0) * window + window;
    const mid = from + (to - from) / 2;
    const imdb_id = "tt1254207";
    const filename = "Big Buck Bunny.mp4";
    const videoToken = ""; // wrong token
    const response = await request(app).get(
      `/video/${imdb_id}/${encodeURIComponent(filename)}?${[
        `t=${mid}`,
        `now=${now}`,
        `token=${videoToken}`,
      ].join("&")}`
    );
    expect(response.statusCode).toBe(403);
    expect(response.text).toBe("Forbidden");
  },
  60 * 1000
);

test(
  "GET /video Gone",
  async () => {
    const to = 10,
      from = 10;
    const window = 60 * 60; // 3600 seconds
    const now = ((Date.now() / 1000 / window) | 0) * window + window - window - 301; // Gone
    const mid = from + (to - from) / 2;
    const imdb_id = "tt1254207";
    const filename = "Big Buck Bunny.mp4";
    const videoToken = crypto
      .createHash("sha1")
      .update([imdb_id, `${filename}`, mid, now, TRACE_MEDIA_SALT].join(""))
      .digest("base64")
      .replace(/[^0-9A-Za-z]/g, "");
    const response = await request(app).get(
      `/video/${imdb_id}/${encodeURIComponent(filename)}?${[
        `t=${mid}`,
        `now=${now}`,
        `token=${videoToken}`,
      ].join("&")}`
    );
    expect(response.statusCode).toBe(410);
    expect(response.text).toBe("Gone");
  },
  60 * 1000
);

test(
  "GET /video Bad Request. Invalid param: t",
  async () => {
    const to = 10,
      from = 10;
    const window = 60 * 60; // 3600 seconds
    const now = ((Date.now() / 1000 / window) | 0) * window + window;
    const mid = from + (to - from) / 2 - 10000; // minus number
    const imdb_id = "tt1254207";
    const filename = "Big Buck Bunny.mp4";
    const videoToken = crypto
      .createHash("sha1")
      .update([imdb_id, `${filename}`, mid, now, TRACE_MEDIA_SALT].join(""))
      .digest("base64")
      .replace(/[^0-9A-Za-z]/g, "");
    const response = await request(app).get(
      `/video/${imdb_id}/${encodeURIComponent(filename)}?${[
        `t=${mid}`,
        `now=${now}`,
        `token=${videoToken}`,
      ].join("&")}`
    );
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("Bad Request. Invalid param: t");
  },
  60 * 1000
);

test(
  "GET /video Not found",
  async () => {
    const to = 10,
      from = 10;
    const window = 60 * 60; // 3600 seconds
    const now = ((Date.now() / 1000 / window) | 0) * window + window;
    const mid = from + (to - from) / 2;
    const imdb_id = "tt1254207";
    const filename = "Wrong File Path.mp4"; // not existent
    const videoToken = crypto
      .createHash("sha1")
      .update([imdb_id, `${filename}`, mid, now, TRACE_MEDIA_SALT].join(""))
      .digest("base64")
      .replace(/[^0-9A-Za-z]/g, "");
    const response = await request(app).get(
      `/video/${imdb_id}/${encodeURIComponent(filename)}?${[
        `t=${mid}`,
        `now=${now}`,
        `token=${videoToken}`,
      ].join("&")}`
    );
    expect(response.statusCode).toBe(404);
    expect(response.text).toBe("Not found");
  },
  60 * 1000
);

test(
  "GET /video Bad Request. Invalid param: size",
  async () => {
    const to = 10,
      from = 10;
    const window = 60 * 60; // 3600 seconds
    const now = ((Date.now() / 1000 / window) | 0) * window + window;
    const mid = from + (to - from) / 2;
    const imdb_id = "tt1254207";
    const filename = "Big Buck Bunny.mp4";
    const videoToken = crypto
      .createHash("sha1")
      .update([imdb_id, `${filename}`, mid, now, TRACE_MEDIA_SALT].join(""))
      .digest("base64")
      .replace(/[^0-9A-Za-z]/g, "");
    const response = await request(app).get(
      `/video/${imdb_id}/${encodeURIComponent(filename)}?${[
        `t=${mid}`,
        `now=${now}`,
        `token=${videoToken}`,
        `size=xxx`,
      ].join("&")}`
    );
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("Bad Request. Invalid param: size");
  },
  60 * 1000
);

/**
 * Hard to cover, not working
 */
// test(
//   "GET /video Internal Server Error",
//   async () => {
//     const to = 10,
//       from = 10;
//     const window = 60 * 60; // 3600 seconds
//     const now = ((Date.now() / 1000 / window) | 0) * window + window;
//     const mid = from + (to - from) / 2 + 100000; // exceed the time length
//     const imdb_id = "tt1254207";
//     const filename = "Big Buck Bunny.mp4";
//     const videoToken = crypto
//       .createHash("sha1")
//       .update([imdb_id, `${filename}`, mid, now, TRACE_MEDIA_SALT].join(""))
//       .digest("base64")
//       .replace(/[^0-9A-Za-z]/g, "");
//     const response = await request(app).get(
//       `/video/${imdb_id}/${encodeURIComponent(filename)}?${[
//         `t=${mid}`,
//         `now=${now}`,
//         `token=${videoToken}`,
//       ].join("&")}`
//     );
//     expect(response.statusCode).toBe(500);
//     expect(response.text).toBe("Internal Server Error");
//   },
//   60 * 1000
// );
