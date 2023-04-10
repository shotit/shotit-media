import "dotenv/config";
import { default as request } from "supertest";
import app from "./app.js";

const { TRACE_API_SECRET } = process.env;

test("GET /list correct", async () => {
  const response = await request(app).get("/list").set("x-trace-secret", TRACE_API_SECRET);
  expect(response.statusCode).toBe(200);
  expect(response.body[0].Key).toBeDefined();
});

test("GET /list/tt1254207", async () => {
  const response = await request(app)
    .get("/list/tt1254207")
    .set("x-trace-secret", TRACE_API_SECRET);
  expect(response.statusCode).toBe(200);
  expect(response.body[0].Key).toBeDefined();
});

test("GET /list/tt1254207/Big%20Buck%20Bunny.mp4", async () => {
  const response = await request(app)
    .get("/list/tt1254207/Big%20Buck%20Bunny.mp4")
    .set("x-trace-secret", TRACE_API_SECRET);
  expect(response.statusCode).toBe(200);
  expect(response.body[0].Key).toBeDefined();
});

test("GET /list/tt1254207/Big%20Buck%20Bunny.mp4 Unauthorized", async () => {
  const response = await request(app).get("/list/tt1254207/Big%20Buck%20Bunny.mp4");
  expect(response.statusCode).toBe(401);
  expect(response.text).toBe("Unauthorized");
});

test("GET /list/xxxxxx Not found", async () => {
  const response = await request(app).get("/list/xxxxxx").set("x-trace-secret", TRACE_API_SECRET);
  expect(response.statusCode).toBe(404);
  expect(response.text).toBe("Not found");
});
