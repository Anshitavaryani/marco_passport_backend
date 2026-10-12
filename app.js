const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const httpStatus = require("http-status");
const path = require("path");
const app = express();

const config = require("./src/config/config.js");
const routes = require("./src/routes/v1");
const morgan = require("./src/config/morgan.js");
const { authLimiter } = require("./src/middlewares/rateLimiter.js");
const corsConfigs = require("./src/config/corsConfigs.js");

const ApiError = require("./src/utils/ApiError.js");
const errorHandler = require("./src/utils/errorHandler.js");
require("./src/models");
const UPLOADS_DIR = path.resolve(__dirname, "./public/uploads");

// Behind nginx: needed for the real client IP in req.ip and for
// express-rate-limit's IP-based keying.
app.set("trust proxy", 1);

// set security HTTP headers
app.use(
  helmet({
    // Uploaded images are served from /images and loaded by a frontend on
    // a different origin, which helmet's default 'same-origin' would block.
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

app.use(cors(corsConfigs));

// limit repeated failed requests to auth endpoints
if (config.env === "production") {
  app.use("/api/v1/user/auth", authLimiter);
  app.use("/api/v1/admin/auth", authLimiter);
}

app.get("/api/healthcheck", function (req, res) {
  res.status(httpStatus.OK).send({ response: "ok" });
});

app.use("/api/v1", routes);

// Uploaded files
app.use("/images", express.static(`${UPLOADS_DIR}/images`));

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});

// error handling
app.use(errorHandler);

module.exports = app;
