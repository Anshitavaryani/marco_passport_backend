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
// Stripe webhook signature verification (see payment.controller.js's
// handleChargeAndIntentWebhook) requires the raw, unparsed request body
// bytes — the signature is computed over the exact raw payload, and
// verifying against an already-JSON-parsed-then-restringified object
// will never match. Capturing the raw buffer here via `verify` means
// every route still gets a normally-parsed req.body, while the webhook
// route can use req.rawBody specifically for signature verification —
// this avoids needing to carve a path-specific exclusion out of this
// global middleware (which is order-sensitive and easy to get subtly
// wrong once other middleware also touches the body).
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

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
// Was scoped to '/v1/auth' — but every route in this app mounts under
// '/api/v1/...' (see app.use('/api/v1', routes) below), not '/v1/...'.
// That prefix never matched a single real request, meaning this rate
// limiter has provided zero brute-force protection this entire time,
// in production or otherwise. Covering both real auth entry points
// (user auth and admin auth) explicitly.
// NOTE: '/api/v1/auth' is my best guess at the user-auth mount path,
// based on the admin route using '/admin/auth' as a parallel structure —
// still waiting on confirmed content for routes/v1/User/index.js and
// routes/v1/index.js to verify this exactly.
if (config.env === "production") {
  app.use("/api/v1/auth", authLimiter);
  app.use("/api/v1/admin/auth", authLimiter);
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
