const rateLimit = require("express-rate-limit");
const httpStatus = require("http-status");
const responseWrapper = require("../config/responseWrapper");
const config = require("../config/config");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  // Pinned so header behaviour doesn't change on library upgrades.
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Match the {success, status, message, data} shape of other responses.
  handler: (req, res) => {
    responseWrapper(
      res,
      "",
      "Too many attempts. Please try again later.",
      httpStatus.TOO_MANY_REQUESTS
    );
  },
});

// Endpoints that send an email (register, resend verification, forgot
// password) answer 200 whatever happens, so authLimiter would never count
// them. This one counts every request per IP. Production only.
const emailLimiter =
  config.env === "production"
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        handler: (req, res) => {
          responseWrapper(
            res,
            "",
            "Too many email requests. Please try again later.",
            httpStatus.TOO_MANY_REQUESTS
          );
        },
      })
    : (req, res, next) => next();

module.exports = {
  authLimiter,
  emailLimiter,
};
