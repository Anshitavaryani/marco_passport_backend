const httpStatus = require("http-status");

const { Country, State } = require("../../models");
const ApiError = require("../../utils/ApiError");
const config = require("../../config/config");

const VALID_SORT_DIRECTIONS = ["ASC", "DESC"];

const getAllCountry = async (query) => {
  const limit = parseInt(query.limit, 10) || config.defaultLimit;
  const offset = parseInt(query.offset, 10) || 0;
  const sortDirection = VALID_SORT_DIRECTIONS.includes(
    String(query.sortBy).toUpperCase()
  )
    ? query.sortBy.toUpperCase()
    : "ASC";

  const result = await Country.findAll({
    attributes: ["id", "name"],
    where: { is_active: true },
    limit,
    offset,
    order: [["id", sortDirection]],
  });
  return result;
};

const getCountryId = async (id) => {
  const result = await Country.findOne({
    attributes: ["id", "name"],
    include: [
      {
        model: State,
        as: "all_state",
        attributes: ["id", "name", "country_id"],
      },
    ],
    where: { is_active: 1, id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Country not found.");
  }
  return result;
};

module.exports = {
  getAllCountry,
  getCountryId,
};
