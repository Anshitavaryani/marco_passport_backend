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
  } else if (err.name === "MulterError") {
    // Upload rejected: too large, too many files, or a field other than
    // "images".
    statusCode = httpStatus.BAD_REQUEST;
    message =
      err.code === "LIMIT_UNEXPECTED_FILE"
        ? `Unexpected upload field "${err.field}". Upload images in the "images" field.`
        : err.message;
    isOperational = true;
  } else if (err.type === "entity.parse.failed") {
    // express.json() couldn't parse the body: the client's mistake, not ours.
    statusCode = httpStatus.BAD_REQUEST;
    message = "The request body isn't valid JSON.";
    isOperational = true;
  }

  // Log the real error regardless of what the client sees.
  if (isOperational) {
    logger.warn(err.message);
  } else {
    logger.error(err);
  }

  // Read by morgan's error log format.
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
