const httpStatus = require("http-status");

const catchAsync = require("../../utils/catchAsync");
const ApiError = require("../../utils/ApiError");
const { placeCategoryService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

// ?type=business or ?type=place — lets /explore and /places request
// only the category pool that's actually relevant to each page.
const getAllCategories = catchAsync(async (req, res) => {
  const filters = {};
  if (req.query.type) {
    filters.type = req.query.type;
  }
  const categories = await placeCategoryService.getAllCategories(filters);

  return responseWrapper(res, categories, "");
});

const findCategoryById = catchAsync(async (req, res) => {
  const categoryDoc = await placeCategoryService.findCategoryById(
    req.params.id
  );

  if (
    !categoryDoc ||
    (Array.isArray(categoryDoc) && categoryDoc.length === 0)
  ) {
    throw new ApiError(httpStatus.NOT_FOUND, "Place category not found.");
  }

  return responseWrapper(res, categoryDoc, "");
});

const createCategory = catchAsync(async (req, res) => {
  const category = await placeCategoryService.createCategory({
    ...req.body,
    image: req.files?.images?.[0]
      ? `/images/${req.files.images[0].filename}`
      : req.body.image,
  });

  return responseWrapper(
    res,
    category,
    "New place category created successfully",
    httpStatus.CREATED
  );
});

const updateCategory = catchAsync(async (req, res) => {
  const categoryDoc = await placeCategoryService.updateCategory(
    {
      ...req.body,
      image: req.files?.images?.[0]
        ? `/images/${req.files.images[0].filename}`
        : req.body.image,
    },
    req.params.id
  );

  return responseWrapper(
    res,
    categoryDoc,
    "Place category updated successfully"
  );
});

const deleteCategory = catchAsync(async (req, res) => {
  await placeCategoryService.deleteCategory(req.params.id);

  return responseWrapper(res, "", "Deleted Successfully.", httpStatus.OK);
});

module.exports = {
  getAllCategories,
  findCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};