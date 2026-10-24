/** @format */

const httpStatus = require("http-status");
const catchAsync = require("../../utils/catchAsync");
const responseWrapper = require("../../config/responseWrapper");
const pick = require("../../utils/pick");
const { userService } = require("../../services/Admin");

const getAllUsers = catchAsync(async (req, res) => {
  const query = pick(req.query, ["limit", "page", "search", "status", "sort", "sortBy"]);
  const response = await userService.getAllUsers(query);
  return responseWrapper(res, response, "Successfully fetched users", httpStatus.OK);
});

const getUserById = catchAsync(async (req, res) => {
  const response = await userService.getUserById(req.params.id);
  return responseWrapper(res, response, "Successfully fetched user", httpStatus.OK);
});

const updateUser = catchAsync(async (req, res) => {
  // `user` is the signed-in admin (set by validateJWTtoken), not a field.
  const { user: admin, ...changes } = req.body;
  const response = await userService.updateUser(req.params.id, changes, admin?.id);
  return responseWrapper(res, response, "User updated successfully", httpStatus.OK);
});

const deleteUsers = catchAsync(async (req, res) => {
  const response = await userService.deleteUsers(req.body);
  return responseWrapper(res, response, "User(s) deleted successfully", httpStatus.OK);
});

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUsers,
};
