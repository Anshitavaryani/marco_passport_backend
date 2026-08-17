const httpStatus = require("http-status");

const { Country, State, City } = require("../../models");
const ApiError = require("../../utils/ApiError");
const config = require("../../config/config");

const VALID_SORT_DIRECTIONS = ["ASC", "DESC"];

const getAllCity = async (body, query, params) => {
  // Was: parseInt(query['limit']) / parseInt(query['offset']) with no
  // fallback — calling this endpoint without explicit ?limit=&offset=
  // params produced NaN, which Sequelize/MySQL would reject. config
  // already has a defaultLimit defined for exactly this purpose
  // (config.js -> DEFAULT_API_DATA_LIMIT) but it wasn't being used here.
  const limit = parseInt(query.limit, 10) || config.defaultLimit;
  const offset = parseInt(query.offset, 10) || 0;
  // query.sortBy was passed directly into Sequelize's order direction
  // with no validation — an arbitrary/garbage value here would throw
  // an unhandled error rather than a clean fallback.
  const sortDirection = VALID_SORT_DIRECTIONS.includes(
    String(query.sortBy).toUpperCase()
  )
    ? query.sortBy.toUpperCase()
    : "ASC";

  const result = await City.findAll({
    attributes: ["id", "name"],
    where: { is_active: 1 },
    limit,
    offset,
    order: [["id", sortDirection]],
  });
  return result;
};

const getCityById = async (body, query, params) => {
  const result = await City.findOne({
    attributes: ["id", "name", "country_id", "state_id"],
    include: [
      {
        model: Country,
        as: "country",
        attributes: ["id", "name"],
      },
      {
        model: State,
        as: "state",
        attributes: ["id", "name"],
      },
    ],
    where: { is_active: 1, id: params.id },
  });
  if (!result) {
    // Was httpStatus.BAD_REQUEST (400) — "this city doesn't exist"
    // is a not-found condition, not a malformed-request one.
    throw new ApiError(httpStatus.NOT_FOUND, "City not found.");
  }
  return result;
};

module.exports = {
  getAllCity,
  getCityById,
};
