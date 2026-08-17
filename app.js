const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const httpStatus = require("http-status");
const cron = require("node-cron");
const path = require("path");
const app = express();

const config = require("./src/config/config.js");
const routes = require("./src/routes/v1");
const morgan = require("./src/config/morgan.js");
const { authLimiter } = require("./src/middlewares/rateLimiter.js");
const corsConfigs = require("./src/config/corsConfigs.js");

const ApiError = require("./src/utils/ApiError.js");
const errorHandler = require("./src/utils/errorHandler.js");
const logger = require("./src/config/logger.js");
require("./src/models");
const PUBLIC_DIR = path.resolve(__dirname, "./public");

// We're behind nginx (reverse proxy). Without this, req.ip, secure cookies,
// and express-rate-limit's IP-based keying all see nginx's IP instead of the
// real client IP. express-rate-limit v8 will actively throw/warn if it
// detects X-Forwarded-For headers while trust proxy isn't configured.
app.set("trust proxy", 1);

cron.schedule("* * * * *", () => {
  logger.info("Heartbeat: server is running.");
});

// set security HTTP headers
app.use(
  helmet({
    // We serve images/videos/docs from /images, /videos, /docs etc. below.
    // Helmet's default crossOriginResourcePolicy ('same-origin') blocks a
    // frontend on a different origin/domain from loading those assets.
    // If your frontend is served from the same origin as this API, you can
    // remove this override and keep helmet's stricter default.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// gzip/brotli compression
app.use(compression());

if (config.env !== "test") {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

app.use(express.static(PUBLIC_DIR));

// Single source of truth for CORS. cors(corsConfigs) already sets
// Access-Control-Allow-Origin, Access-Control-Allow-Credentials, and a
// correct Vary: Origin header on its own — that's what the package is
// for. The old credentials.js middleware hand-rolled the same
// Origin/Credentials logic a second time in parallel, and additionally
// set Access-Control-Allow-Methods/Headers to '*' unconditionally on
// every response (not just preflight, where those headers are actually
// meaningful). Removed as redundant — delete src/middlewares/credentials.js
// from the repo.
app.use(cors(corsConfigs));

// limit repeated failed requests to auth endpoints
if (config.env === "production") {
  app.use("/v1/auth", authLimiter);
}

app.get("/api/healthcheck", function (req, res) {
  res.status(httpStatus.OK).send({ response: "ok" });
});

// Added multer with all v1 api routes
app.use("/api/v1", routes);

// All File Apis
app.use("/images", express.static(`${PUBLIC_DIR}/uploads/images`));
app.use("/videos", express.static(`${PUBLIC_DIR}/uploads/videos`));
app.use("/gifs", express.static(`${PUBLIC_DIR}/uploads/gifs`));
app.use("/docs", express.static(`${PUBLIC_DIR}/uploads/docs`));
app.use("/songs", express.static(`${PUBLIC_DIR}/uploads/songs`));

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});

// error handling
app.use(errorHandler);

module.exports = app;
