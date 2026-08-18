const httpStatus = require("http-status");
const slugify = require("slugify");

const { BlogCategory } = require("../../models");
const ApiError = require("../../utils/ApiError");

const createCategory = async (reqBody) => {
  if (!reqBody.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Category name is required.");
  }

  // Auto-derive slug from name unless one was explicitly provided —
  // matches the URL-safe segment the frontend needs for category
  // filtering (e.g. "Food & Dining" -> "food-dining").
  const slug = reqBody.slug
    ? slugify(reqBody.slug, { lower: true, strict: true })
    : slugify(reqBody.name, { lower: true, strict: true });

  if (await BlogCategory.isSlugTaken(slug)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "A category with this slug already exists."
    );
  }

  const categoryObj = {
    name: reqBody.name,
    slug,
  };
  const categoryDoc = await BlogCategory.create(categoryObj);
  if (!categoryDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new blog category"
    );
  }
  return categoryDoc;
};

const updateCategory = async (reqBody, id) => {
  const categoryDoc = await BlogCategory.findByPk(id);
  if (!categoryDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog category not found");
  }

  if (
    reqBody.name &&
    typeof reqBody.name !== "undefined" &&
    reqBody.name !== ""
  ) {
    categoryDoc["name"] = reqBody.name;
  }

  if (
    reqBody.slug &&
    typeof reqBody.slug !== "undefined" &&
    reqBody.slug !== ""
  ) {
    const newSlug = slugify(reqBody.slug, { lower: true, strict: true });
    if (newSlug !== categoryDoc.slug && (await BlogCategory.isSlugTaken(newSlug))) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "A category with this slug already exists."
      );
    }
    categoryDoc["slug"] = newSlug;
  }

  await categoryDoc.save();
  return categoryDoc;
};

const getAllCategories = async () => {
  const categoryDocs = await BlogCategory.findAll({ where: { is_active: 1 } });
  return categoryDocs;
};

// Matches department.service.js's findDepartmentById convention
// (returns [] rather than null when not found) for consistency across
// this codebase — same caveat applies: a caller checking `if (!result)`
// alone won't catch the not-found case, so the controller layer
// explicitly checks for an empty array too (see blogCategory.controller.js).
const findCategoryById = async (id) => {
  const categoryDoc = await BlogCategory.findByPk(id);
  return categoryDoc ? categoryDoc : [];
};

const deleteCategory = async (id) => {
  const categoryDoc = await BlogCategory.findByPk(Number(id));
  if (!categoryDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog category not found");
  }
  return await categoryDoc.destroy();
};

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  findCategoryById,
  deleteCategory,
};