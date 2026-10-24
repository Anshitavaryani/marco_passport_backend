/** @format */

const catchAsync = require("../../utils/catchAsync");
const responseWrapper = require("../../config/responseWrapper");
const { adminPassportService } = require("../../services/Admin");

const listPassports = catchAsync(async (req, res) => {
  const response = await adminPassportService.listPassports(req.query);
  return responseWrapper(res, response, "");
});

const getPassport = catchAsync(async (req, res) => {
  const response = await adminPassportService.getPassport(req.params.id);
  return responseWrapper(res, response, "");
});

module.exports = {
  listPassports,
  getPassport,
};
