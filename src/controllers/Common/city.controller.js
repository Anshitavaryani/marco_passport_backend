const catchAsync = require("../../utils/catchAsync");
const { cityService } = require("../../services");
const pick = require("../../utils/pick");
const config = require("../../config/config");
const responseWrapper = require("../../config/responseWrapper");

// city.service validates sortBy/limit/offset and falls back safely.
const getAllCity = catchAsync(async (req, res) => {
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

  const response = await cityService.getAllCity(query);
  return responseWrapper(res, response, "");
});

const getCityById = catchAsync(async (req, res) => {
  const response = await cityService.getCityById(req.params.id);
  return responseWrapper(res, response, "");
});

module.exports = {
  getAllCity,
  getCityById,
};
