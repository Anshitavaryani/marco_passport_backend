const httpStatus = require("http-status");

const catchAsync = require("../../utils/catchAsync");
const { passportService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

// req.body.user is set by userAuthMiddleware.verifyAuthJWTToken.
const userId = (req) => req.body.user.id;

const listPassports = catchAsync(async (req, res) => {
  const passports = await passportService.listPassports(userId(req));
  return responseWrapper(res, passports, "");
});

const getPassport = catchAsync(async (req, res) => {
  const passport = await passportService.getPassport(userId(req), req.params.id);
  return responseWrapper(res, passport, "");
});

const createPassport = catchAsync(async (req, res) => {
  const passport = await passportService.createPassport(userId(req), req.body);
  return responseWrapper(res, passport, "Passport saved.", httpStatus.CREATED);
});

const updatePassport = catchAsync(async (req, res) => {
  const passport = await passportService.updatePassport(
    userId(req),
    req.params.id,
    req.body
  );
  return responseWrapper(res, passport, "Passport updated.");
});

const addItem = catchAsync(async (req, res) => {
  const passport = await passportService.addItem(userId(req), req.params.id, req.body);
  return responseWrapper(res, passport, "Added to your passport.", httpStatus.CREATED);
});

const deletePassport = catchAsync(async (req, res) => {
  await passportService.deletePassport(userId(req), req.params.id);
  return responseWrapper(res, "", "Passport deleted.");
});

module.exports = {
  listPassports,
  getPassport,
  createPassport,
  updatePassport,
  addItem,
  deletePassport,
};
