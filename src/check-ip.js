import "dotenv/config";

const { IP_WHITELIST } = process.env;

export default async (req, res, next) => {
  const ipv4 = req.ip.toString().replace("::ffff:", "");
  if (ipv4 !== IP_WHITELIST) {
    res.status(401).send("Unauthorized");
    return;
  }
  if (req.baseUrl === "/check-ip") {
    res.status(200).send("check-ip OK");
    return;
  }
  next();
};
