const catchAsync = require("../../utils/catchAsync");
const pick = require("../../utils/pick");
const responseWrapper = require("../../config/responseWrapper");
const { userService } = require("../../services");

const getProfile = catchAsync(async (req, res) => {
  const response = await userService.getProfile(req.body, req.headers);
  return responseWrapper(res, response, "");
});

const deactivateAccount = catchAsync(async (req, res) => {
  const response = await userService.deactivateAccount(req.body);
  return responseWrapper(res, response, "Account Successfully Deactivated.");
});

const notificationToggle = catchAsync(async (req, res) => {
  const body = pick(req.body, ["user"]);
  const response = await userService.notificationToggle(body);
  const message =
    response.notification_status === true
      ? "Notification turned On!"
      : "Notification turned Off!";
  return responseWrapper(res, "", message);
});

module.exports = {
  getProfile,
  deactivateAccount,
  notificationToggle,
};