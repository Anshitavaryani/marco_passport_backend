const httpStatus = require("http-status");

const catchAsync = require("../../utils/catchAsync");
const { magazineService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

const listMagazinesAdmin = catchAsync(async (req, res) => {
  const result = await magazineService.listMagazinesAdmin(req.query);
  return responseWrapper(res, result, "");
});

const getMagazineAdmin = catchAsync(async (req, res) => {
  const magazine = await magazineService.getMagazineAdmin(req.params.id);
  return responseWrapper(res, magazine, "");
});

const createMagazine = catchAsync(async (req, res) => {
  const magazine = await magazineService.createMagazine(
    req.body,
    req.body.user.id,
  );
  return responseWrapper(res, magazine, "Issue created.", httpStatus.CREATED);
});

const updateMagazine = catchAsync(async (req, res) => {
  const magazine = await magazineService.updateMagazine(
    req.params.id,
    req.body,
    req.body.user.id,
  );
  return responseWrapper(res, magazine, "Issue saved.");
});

const deleteMagazine = catchAsync(async (req, res) => {
  await magazineService.deleteMagazine(req.params.id, req.body.user.id);
  return responseWrapper(res, "", "Issue deleted.");
});

const listMagazines = catchAsync(async (req, res) => {
  const result = await magazineService.listMagazines(req.query);
  return responseWrapper(res, result, "");
});

const getMagazineBySlug = catchAsync(async (req, res) => {
  const magazine = await magazineService.getMagazineBySlug(req.params.slug);
  return responseWrapper(res, magazine, "");
});

module.exports = {
  listMagazinesAdmin,
  getMagazineAdmin,
  createMagazine,
  updateMagazine,
  deleteMagazine,
  listMagazines,
  getMagazineBySlug,
};
