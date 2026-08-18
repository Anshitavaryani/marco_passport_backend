const catchAsync = require("../../utils/catchAsync");
const { cityService } = require("../../services");
const pick = require("../../utils/pick");
const config = require("../../config/config");
const responseWrapper = require("../../config/responseWrapper");

// NOTE: the presence/emptiness checks below (limit/page/sortBy) don't
// validate that a *provided* value is well-formed — e.g. ?sortBy=banana
// passes straight through. That's fine: city.service.js already
// validates the sort direction against an allow-list and falls back
// safely on garbage limit/offset values. Left as-is rather than
// duplicating that validation at this layer too.
const getAllCity = catchAsync(async (req, res) => {
  const body = pick(req.body, []);
  const query = pick(req.query, ["sortBy", "limit", "page"]);
  const params = pick(req.params, []);

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

  const response = await cityService.getAllCity(body, query, params);
  return responseWrapper(res, response, "");
});

const getCityById = catchAsync(async (req, res) => {
  const body = pick(req.body, []);
  const query = pick(req.query, ["sortBy", "limit", "page"]);
  const params = pick(req.params, ["id"]);

  const response = await cityService.getCityById(body, query, params);
  return responseWrapper(res, response, "");
});

module.exports = {
  getAllCity,
  getCityById,
};
