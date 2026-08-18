const httpStatus = require("http-status");
const catchAsync = require("../../utils/catchAsync");
const { adminAuthService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

const createAdminUser = catchAsync(async (req, res) => {
  // Was discarding the created record (responseWrapper(res, '', ...))
  // even though the service already returns it.
  const admin = await adminAuthService.createAdminUser(req.body);
  return responseWrapper(
    res,
    admin,
    "Admin Created Successfully.",
    httpStatus.CREATED
  );
});

const loginAdminUser = catchAsync(async (req, res) => {
  const response = await adminAuthService.loginAdminUser(req.body);
  return responseWrapper(res, response, "", httpStatus.OK);
});

const resetAdminPassword = catchAsync(async (req, res) => {
  const response = await adminAuthService.resetAdminPassword(req.body);
  return responseWrapper(res, response, "", httpStatus.OK);
});

const sendOTP = catchAsync(async (req, res) => {
  await adminAuthService.sendOTP(req.body.email);
  return responseWrapper(
    res,
    "",
    "OTP has been Sent To Your Email",
    httpStatus.OK
  );
});

const verifyOTP = catchAsync(async (req, res) => {
  // Was:
  //   if (!status) { responseWrapper(res, '', 'Ineternal Server Error', 500); };
  //   responseWrapper(res, status, 'OTP has been verified', 200);
  // Two bugs stacked: (1) no return/else between them, so whenever the
  // first branch ran, execution fell straight through into the second
  // responseWrapper call anyway — two responses sent on the same `res`,
  // which throws "Cannot set headers after they are sent to the client".
  // (2) the check itself was wrong: adminAuth.service.js's verifyOTP
  // returns `token ? {token} : ''` — an empty string is a legitimate
  // SUCCESS case (OTP verified, just not a FORGOT_PASSWORD type, so no
  // token needed), not a failure. There's no actual failure return
  // value from this service function — it either resolves normally
  // (including the empty-string case) or throws, which catchAsync
  // already forwards correctly. The check was checking the wrong thing
  // entirely, not just missing a return.
  const status = await adminAuthService.verifyOTP(
    req.body.email,
    req.body.otp,
    req.body.otp_type
  );
  return responseWrapper(res, status, "OTP has been verified", httpStatus.OK);
});

const forgotAdminPassword = catchAsync(async (req, res) => {
  const response = await adminAuthService.forgotAdminPassword(req.body);
  return responseWrapper(res, response, "", httpStatus.OK);
});

module.exports = {
  createAdminUser,
  loginAdminUser,
  resetAdminPassword,
  sendOTP,
  verifyOTP,
  forgotAdminPassword,
};
