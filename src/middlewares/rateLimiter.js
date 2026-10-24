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
// them. These count every request per IP: 5 an hour, with each endpoint
// keeping its own count, so a sign-up and a few resends don't block a
// password reset. Production only.
const createEmailLimiter = () =>
  config.env === "production"
    ? rateLimit({
        windowMs: 60 * 60 * 1000,
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

const registerEmailLimiter = createEmailLimiter();
const resendVerificationLimiter = createEmailLimiter();
const forgotPasswordLimiter = createEmailLimiter();

module.exports = {
  authLimiter,
  registerEmailLimiter,
  resendVerificationLimiter,
  forgotPasswordLimiter,
};
