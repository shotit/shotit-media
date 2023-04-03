import "dotenv/config";
import { default as request } from "supertest";
import app from "./app.js";

const { IP_WHITELIST } = process.env;

test("GET /check-ip correct", async () => {
  const response = await request(app).get("/check-ip").set("X-Forwarded-For", IP_WHITELIST);
  expect(response.statusCode).toBe(200);
});

test("GET /check-ip wrong", async () => {
  const response = await request(app).get("/check-ip");
  expect(response.statusCode).toBe(401);
});
