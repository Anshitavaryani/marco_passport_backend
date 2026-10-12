const httpStatus = require("http-status");
const catchAsync = require("../../utils/catchAsync");
const { stateService } = require("../../services");
const pick = require("../../utils/pick");
const config = require("../../config/config");
const responseWrapper = require("../../config/responseWrapper");

const getAllState = catchAsync(async (req, res) => {
  const query = pick(req.query, ["sortBy", "limit", "page"]);

  if (!query["limit"]) {
    query["limit"] = config.defaultLimit;
  }
  if (!query["page"]) {
    query["page"] = 1;
  }
  if (!query["sortBy"] || query["sortBy"] === "") {
    query["sortBy"] = "ASC";
  }
  const offset = (query["page"] - 1) * query["limit"];
  query["offset"] = offset;

  const response = await stateService.getAllState(query);
  return responseWrapper(res, response, "", httpStatus.OK);
});

const getStateById = catchAsync(async (req, res) => {
  const response = await stateService.getStateById(req.params.id);
  return responseWrapper(res, response, "", httpStatus.OK);
});

module.exports = {
  getAllState,
  getStateById,
};
