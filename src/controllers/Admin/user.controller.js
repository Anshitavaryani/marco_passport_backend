/** @format */

const httpStatus = require("http-status");
const catchAsync = require("../../utils/catchAsync");
const responseWrapper = require("../../config/responseWrapper");
const pick = require("../../utils/pick");
const config = require("../../config/config"); // adjust path if different
const { userService } = require("../../services/Admin");

const getAllUsers = catchAsync(async (req, res) => {
  const query = pick(req.query, ["limit", "sortBy", "offset", "page", "search"]);

  if (!query.limit) query.limit = config.defaultLimit || 10;
  if (!query.page) query.page = 1;
  if (!query.sortBy) query.sortBy = "ASC";

  query.offset = (query.page - 1) * query.limit;

  const response = await userService.getAllUsers(query);
  return responseWrapper(res, response, "Successfully fetched users", httpStatus.OK);
});

const getUserById = catchAsync(async (req, res) => {
  const response = await userService.getUserById(req.params.id);
  return responseWrapper(res, response, "Successfully fetched user", httpStatus.OK);
});

const deleteUsers = catchAsync(async (req, res) => {
  const response = await userService.deleteUsers(req.body);
  return responseWrapper(res, response, "User(s) deleted successfully", httpStatus.OK);
});

module.exports = {
  getAllUsers,
  getUserById,
  deleteUsers,
};