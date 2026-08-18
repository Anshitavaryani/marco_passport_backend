const httpStatus = require("http-status");

const catchAsync = require("../../utils/catchAsync");
const ApiError = require("../../utils/ApiError");
const { blogCategoryService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

const getAllCategories = catchAsync(async (req, res) => {
  const categories = await blogCategoryService.getAllCategories();
  return responseWrapper(res, categories, "");
});

const createCategory = catchAsync(async (req, res) => {
  const category = await blogCategoryService.createCategory(req.body);
  return responseWrapper(
    res,
    category,
    "New blog category created successfully",
    httpStatus.CREATED
  );
});

const updateCategory = catchAsync(async (req, res) => {
  const categoryDoc = await blogCategoryService.updateCategory(
    req.body,
    req.params.id
  );
  return responseWrapper(res, categoryDoc, "Blog category updated successfully");
});

const findCategoryById = catchAsync(async (req, res) => {
  const categoryDoc = await blogCategoryService.findCategoryById(
    req.params.id
  );
  if (
    !categoryDoc ||
    (Array.isArray(categoryDoc) && categoryDoc.length === 0)
  ) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog category not found.");
  }
  return responseWrapper(res, categoryDoc, "");
});

const deleteCategory = catchAsync(async (req, res) => {
  await blogCategoryService.deleteCategory(req.params.id);
  return responseWrapper(res, "", "Deleted Successfully.", httpStatus.OK);
});

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  findCategoryById,
  deleteCategory,
};