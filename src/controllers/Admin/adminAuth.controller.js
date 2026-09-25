const httpStatus = require("http-status");

const catchAsync = require("../../utils/catchAsync");
const { adminAuthService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

const createAdminUser = catchAsync(async (req, res) => {
  const response = await adminAuthService.createAdminUser(req.body);
  return responseWrapper(
    res,
    response,
    "Admin created successfully",
    httpStatus.CREATED
  );
});

const loginAdminUser = catchAsync(async (req, res) => {
  const response = await adminAuthService.loginAdminUser(req.body);
  return responseWrapper(res, response, "Successfully Logged in.");
});

const resetAdminPassword = catchAsync(async (req, res) => {
  const response = await adminAuthService.resetAdminPassword(req.body);
  return responseWrapper(res, response, "Password changed Successfully.");
});

const sendOTP = catchAsync(async (req, res) => {
  const response = await adminAuthService.sendOTP(req.body.email);
  return responseWrapper(res, response, "OTP has been sent to your email.");
});

const verifyOTP = catchAsync(async (req, res) => {
  const response = await adminAuthService.verifyOTP(
    req.body.email,
    req.body.otp,
    req.body.otp_type
  );
  return responseWrapper(res, response, "OTP has been verified.");
});

const forgotAdminPassword = catchAsync(async (req, res) => {
  const response = await adminAuthService.forgotAdminPassword(req.body);
  return responseWrapper(res, response, "Password changed Successfully.");
});

const getProfile = catchAsync(async (req, res) => {
  const response = await adminAuthService.getProfile(req.body);
  return responseWrapper(res, response, "Successfully fetched profile.");
});

const getAllAdmins = catchAsync(async (req, res) => {
  const users = await adminAuthService.getAllAdmins();
  return responseWrapper(res, users, "");
});

const findAdminById = catchAsync(async (req, res) => {
  const adminDoc = await adminAuthService.findAdminById(req.params.id);
  return responseWrapper(res, adminDoc, "");
});

const updateAdmin = catchAsync(async (req, res) => {
  const response = await adminAuthService.updateAdmin(
    req.params.id,
    req.body
  );
  return responseWrapper(res, response, "Admin updated successfully.");
});

const deleteAdmin = catchAsync(async (req, res) => {
  await adminAuthService.deleteAdmin(req.params.id);
  return responseWrapper(res, "", "Deleted Successfully.", httpStatus.OK);
});

module.exports = {
  createAdminUser,
  loginAdminUser,
  resetAdminPassword,
  sendOTP,
  verifyOTP,
  forgotAdminPassword,
  getProfile,
  getAllAdmins,
  findAdminById,
  updateAdmin,
  deleteAdmin,
};