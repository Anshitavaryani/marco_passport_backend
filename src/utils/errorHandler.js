const httpStatus = require("http-status");
const ApiError = require("./ApiError");
const config = require("../config/config");
const logger = require("../config/logger");

const errorHandler = (err, req, res, next) => {
  let statusCode = httpStatus.INTERNAL_SERVER_ERROR;
  let message = "An internal server error occurred.";
  let isOperational = false;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    isOperational = err.isOperational;
    // Operational errors (validation failures, business-logic
    // rejections) are meant to be shown to the client as-is.
    // Non-operational ones (bugs, unexpected exceptions) should never
    // leak err.message to the client — it can contain internal detail
    // (DB errors, file paths, library internals) you don't want exposed.
    if (isOperational) {
      message = err.message;
    }
  } else if (
    err.name === "SequelizeValidationError" ||
    err.name === "SequelizeUniqueConstraintError"
  ) {
    // Common case: a uniqueness/format constraint fails at the DB layer
    // (e.g. a race condition slipping past an earlier isEmailTaken()
    // check). Treat these as operational 400s instead of opaque 500s.
    statusCode = httpStatus.BAD_REQUEST;
    message = err.errors?.[0]?.message || "Invalid data.";
    isOperational = true;
  }

  // Log the real error internally regardless of what the client sees.
  // Previously nothing in this file logged anything — morgan's error
  // format only logs a one-line summary, never a stack trace, so an
  // unexpected bug left zero debuggable detail anywhere.
  if (isOperational) {
    logger.warn(err.message);
  } else {
    logger.error(err);
  }

  // morgan's error log format reads this to include the message on the
  // same line as the request — it was never set, so those log lines
  // always ended with an empty "message: ".
  res.locals.errorMessage = err.message;

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    data: "",
    ...(config.env !== "production" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
