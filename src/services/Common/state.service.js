const httpStatus = require("http-status");

const { Country, State, City } = require("../../models");
const ApiError = require("../../utils/ApiError");
const config = require("../../config/config");

const VALID_SORT_DIRECTIONS = ["ASC", "DESC"];

const getAllState = async (body, query, params) => {
  const limit = parseInt(query.limit, 10) || config.defaultLimit;
  const offset = parseInt(query.offset, 10) || 0;
  const sortDirection = VALID_SORT_DIRECTIONS.includes(
    String(query.sortBy).toUpperCase()
  )
    ? query.sortBy.toUpperCase()
    : "ASC";

  const result = await State.findAll({
    attributes: ["id", "name"],
    where: { is_active: 1 },
    limit,
    offset,
    order: [["id", sortDirection]],
  });
  return result;
};

const getStateById = async (body, query, params) => {
  const result = await State.findOne({
    attributes: ["id", "name"],
    include: [
      {
        model: Country,
        as: "country",
        attributes: ["id", "name"],
      },
      {
        model: City,
        as: "all_city",
        attributes: ["id", "name"],
      },
    ],
    where: { is_active: 1, id: params.id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "State not found.");
  }
  return result;
};

module.exports = {
  getAllState,
  getStateById,
};
