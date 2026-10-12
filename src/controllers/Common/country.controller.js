const catchAsync = require("../../utils/catchAsync");
const { countryService } = require("../../services");
const pick = require("../../utils/pick");
const config = require("../../config/config");
const responseWrapper = require("../../config/responseWrapper");

const getAllCountry = catchAsync(async (req, res) => {
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

  const response = await countryService.getAllCountry(query);
  return responseWrapper(res, response, "");
});

const getCountryId = catchAsync(async (req, res) => {
  const response = await countryService.getCountryId(req.params.id);
  return responseWrapper(res, response, "");
});

module.exports = {
  getAllCountry,
  getCountryId,
};
