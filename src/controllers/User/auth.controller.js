const httpStatus = require("http-status");

const validatePassword = require("../../helpers/validatePassword");
const catchAsync = require("../../utils/catchAsync");
const { userAuthService } = require("../../services");
const pick = require("../../utils/pick");
const responseWrapper = require("../../config/responseWrapper");

const register = catchAsync(async (req, res) => {
  const body = pick(req.body, [
    "name",
    "email",
    "password",
    "confirm_password",
  ]);
  const headers = pick(req.headers, ["role_id"]);
  const response = await userAuthService.register(body, headers);
  return responseWrapper(
    res,
    response,
    "Account created. Check your email for a link to verify your account.",
    httpStatus.CREATED
  );
});

const verifyEmail = catchAsync(async (req, res) => {
  const response = await userAuthService.verifyEmail(req.body?.token, {
    ip_address: req.ip,
    timezone: req.headers.timezone,
  });
  return responseWrapper(res, response, "Email verified. You're now logged in.");
});

const resendVerification = catchAsync(async (req, res) => {
  await userAuthService.resendVerification(req.body?.email, req.headers.role_id);
  return responseWrapper(
    res,
    "",
    "If that email has an unverified account, a new verification link is on its way."
  );
});

const login = catchAsync(async (req, res) => {
  const response = await userAuthService.login(req.body, req.headers);
  return responseWrapper(res, response, "Successfully Logged in.");
});

const changePassword = catchAsync(async (req, res) => {
  const { new_password, confirm_password } = req.body;

  if (!validatePassword(new_password)) {
    return responseWrapper(
      res,
      "",
      userAuthService.PASSWORD_RULES_MESSAGE,
      httpStatus.BAD_REQUEST
    );
  }

  if (new_password !== confirm_password) {
    return responseWrapper(
      res,
      "",
      "Password and Confirm Password must be equal",
      httpStatus.BAD_REQUEST
    );
  }

  const response = await userAuthService.changePassword(req.body);
  return responseWrapper(res, response, "Password changed Successfully.");
});

const forgotPassword = catchAsync(async (req, res) => {
  await userAuthService.forgotPassword(req.body?.email, req.headers.role_id);
  return responseWrapper(
    res,
    "",
    "If an account exists for that email, a password reset link is on its way."
  );
});

const resetPassword = catchAsync(async (req, res) => {
  await userAuthService.resetPassword(
    pick(req.body || {}, ["token", "password", "confirm_password"])
  );
  return responseWrapper(
    res,
    "",
    "Password changed successfully. Please log in with your new password."
  );
});

const logout = catchAsync(async (req, res) => {
  const response = await userAuthService.logout(req.body, req.headers);
  return responseWrapper(res, response, "Successfully Logged out.");
});

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
};
