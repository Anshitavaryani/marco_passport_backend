const catchAsync = require("../../utils/catchAsync");
const { userOpService } = require("../../services");
const pick = require("../../utils/pick");
const responseWrapper = require("../../config/responseWrapper");

const getProfile = catchAsync(async (req, res) => {
  const response = await userOpService.getProfile(req.body, req.headers);
  return responseWrapper(res, response, "");
});

const deactivateAccount = catchAsync(async (req, res) => {
  const response = await userOpService.deactivateAccount(req.body);
  return responseWrapper(res, response, "Account Successfully Deactivated.");
});

const notificationToogle = catchAsync(async (req, res) => {
  const body = pick(req.body, ["user"]);
  // Was `userOpService.notificationToogle(body)` — user.service.js
  // exports both spellings (an alias was added specifically for this
  // situation), so switching this call to the corrected name now that
  // it's confirmed safe to do.
  const response = await userOpService.notificationToggle(body);
  // Was: `message = (...)` with no const/let — same class of bug as
  // payment.controller.js's `paymentMethod = ''` a couple turns back:
  // an accidental implicit global variable (JS "sloppy mode" — this
  // file has no 'use strict' and CommonJS modules aren't strict by
  // default). It happened to work here since there's no await between
  // the assignment and its use, but `message` is a far more
  // collision-prone name than that earlier case, and a global shared
  // across every concurrent in-flight request is exactly the kind of
  // landmine that turns into a confusing intermittent bug later.
  const message =
    response.notification_status === true
      ? "Notification turned On!"
      : "Notification turned Off!";
  return responseWrapper(res, "", message);
});

module.exports = {
  getProfile,
  deactivateAccount,
  notificationToogle,
  notificationToggle: notificationToogle, // correctly-spelled alias — switch route files over when convenient, then drop the typo'd export
};
