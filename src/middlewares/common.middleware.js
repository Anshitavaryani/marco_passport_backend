const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");
const responseWrapper = require("../config/responseWrapper");

// Shared by userAuth.middleware.js and adminAuth.middleware.js.
const validateResetPassordBody = catchAsync(async (req, res, next) => {
  const { old_password, new_password, confirm_password } = req.body;

  if (!old_password || !new_password || !confirm_password) {
    return responseWrapper(
      res,
      "",
      "Please Enter Required Fields : [ old_password || new_password || confirm_password ]",
      httpStatus.BAD_REQUEST
    );
  }

  if (new_password !== confirm_password) {
    return responseWrapper(
      res,
      "",
      "New Password and Confirm Password Must Be Equal",
      httpStatus.BAD_REQUEST
    );
  }

  next();
});

module.exports = {
  validateResetPassordBody,
};
