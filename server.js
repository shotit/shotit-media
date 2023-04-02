import "dotenv/config.js";
import app from "./src/app.js";

const {
  SERVER_ADDR = "0.0.0.0",
  SERVER_PORT = 3000,
  VIDEO_PATH = "/mnt/",
  TRACE_MEDIA_SALT,
  TRACE_API_SECRET,
} = process.env;

if (TRACE_API_SECRET) {
  console.log("Video upload/download secured by TRACE_API_SECRET");
}
if (TRACE_MEDIA_SALT) {
  console.log("Video clip and image secured by TRACE_MEDIA_SALT");
}

console.log(`VIDEO_PATH: ${VIDEO_PATH}`);
app.listen(SERVER_PORT, SERVER_ADDR, () =>
  console.log(`Media broker listening on ${SERVER_ADDR}:${SERVER_PORT}`)
);
