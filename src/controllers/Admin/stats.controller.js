/** @format */

const catchAsync = require("../../utils/catchAsync");
const responseWrapper = require("../../config/responseWrapper");
const { statsService } = require("../../services/Admin");

const getStats = catchAsync(async (req, res) => {
  const response = await statsService.getStats();
  return responseWrapper(res, response, "");
});

module.exports = {
  getStats,
};
