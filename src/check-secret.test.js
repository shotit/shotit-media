import "dotenv/config";
import { default as request } from "supertest";
import app from "./app.js";

const { TRACE_API_SECRET } = process.env;

test("GET /check-secret correct", async () => {
  const response = await request(app).get("/check-secret").set("x-trace-secret", TRACE_API_SECRET);
  expect(response.statusCode).toBe(200);
});

test("GET /check-secret wrong", async () => {
  const response = await request(app).get("/check-secret");
  expect(response.statusCode).toBe(401);
});
