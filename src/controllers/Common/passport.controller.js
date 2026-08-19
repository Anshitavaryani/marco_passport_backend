const httpStatus = require("http-status");

const catchAsync = require("../../utils/catchAsync");
const { passportService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

const addToPassport = catchAsync(async (req, res) => {
  const entry = await passportService.addToPassport(
    req.body.user?.id,
    req.body.place_id,
    req.body.visit_date
  );
  return responseWrapper(
    res,
    entry,
    "Added to your passport.",
    httpStatus.CREATED
  );
});

const getPassportList = catchAsync(async (req, res) => {
  const list = await passportService.getPassportList(req.body.user?.id);
  return responseWrapper(res, list, "");
});

const updateVisitDate = catchAsync(async (req, res) => {
  const entry = await passportService.updateVisitDate(
    req.body.user?.id,
    req.params.id,
    req.body.visit_date
  );
  return responseWrapper(res, entry, "Visit date updated.");
});

const removeFromPassport = catchAsync(async (req, res) => {
  await passportService.removeFromPassport(req.body.user?.id, req.params.id);
  return responseWrapper(
    res,
    "",
    "Removed from your passport.",
    httpStatus.OK
  );
});

module.exports = {
  addToPassport,
  getPassportList,
  updateVisitDate,
  removeFromPassport,
};