import "dotenv/config";
import { default as request } from "supertest";
import app from "./app.js";

const { IP_WHITELIST } = process.env;

test(
  "GET /admin correct",
  async () => {
    const response = await request(app).get("/admin").set("X-Forwarded-For", IP_WHITELIST);
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^text\/html/);
  },
  60 * 1000
);

test("GET /admin Unauthorized", async () => {
  const response = await request(app).get("/admin");
  expect(response.statusCode).toBe(401);
  expect(response.text).toBe("Unauthorized");
});
