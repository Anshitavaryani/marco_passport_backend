const rateLimit = require("express-rate-limit");
const httpStatus = require("http-status");
const responseWrapper = require("../config/responseWrapper");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  // Pinned explicitly rather than left on version defaults — v7+ changed
  // what's sent by default (legacy X-RateLimit-* headers used to be on
  // by default; now they're off unless requested). Pinning means this
  // can't silently change again on a future express-rate-limit upgrade.
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Without this, a rate-limited response uses express-rate-limit's own
  // default body shape, which doesn't match the {success, status,
  // message, data} shape every other response in this API uses.
  handler: (req, res) => {
    responseWrapper(
      res,
      "",
      "Too many attempts. Please try again later.",
      httpStatus.TOO_MANY_REQUESTS
    );
  },
});

module.exports = {
  authLimiter,
};
