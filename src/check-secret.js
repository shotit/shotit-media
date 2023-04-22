import "dotenv/config";

const { TRACE_API_SECRET } = process.env;

export default async (req, res, next) => {
  if (TRACE_API_SECRET && req.header("x-trace-secret") !== TRACE_API_SECRET) {
    res.status(401).send("Unauthorized");
    return;
  }
  if (req.baseUrl === "/check-secret") {
    res.status(200).send("check-secret OK");
    return;
  }
  next();
};
