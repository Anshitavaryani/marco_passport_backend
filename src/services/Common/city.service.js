const httpStatus = require("http-status");

const { Country, State, City } = require("../../models");
const ApiError = require("../../utils/ApiError");
const config = require("../../config/config");

const VALID_SORT_DIRECTIONS = ["ASC", "DESC"];

const getAllCity = async (query) => {
  const limit = parseInt(query.limit, 10) || config.defaultLimit;
  const offset = parseInt(query.offset, 10) || 0;
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

const getCityById = async (id) => {
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
    where: { is_active: 1, id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "City not found.");
  }
  return result;
};

module.exports = {
  getAllCity,
  getCityById,
};
