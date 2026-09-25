const httpStatus = require("http-status");
const slugify = require("slugify");

const { BlogCategory } = require("../../models");
const ApiError = require("../../utils/ApiError");

const createCategory = async (reqBody) => {
  if (!reqBody.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Category name is required.");
  }

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

  const nameChanged =
    reqBody.name &&
    typeof reqBody.name !== "undefined" &&
    reqBody.name !== "" &&
    reqBody.name !== categoryDoc.name;

  if (nameChanged) {
    categoryDoc["name"] = reqBody.name;
  }

  // If a slug was explicitly provided, use that (existing behavior).
  // Otherwise, if the name just changed, auto-regenerate the slug from
  // the new name — matches createCategory's own auto-derive behavior,
  // so an update doesn't silently leave a stale slug that no longer
  // matches the category's actual name.
  const explicitSlug =
    reqBody.slug && typeof reqBody.slug !== "undefined" && reqBody.slug !== "";

  if (explicitSlug || nameChanged) {
    const newSlug = explicitSlug
      ? slugify(reqBody.slug, { lower: true, strict: true })
      : slugify(reqBody.name, { lower: true, strict: true });

    if (newSlug !== categoryDoc.slug) {
      if (await BlogCategory.isSlugTaken(newSlug)) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "A category with this slug already exists."
        );
      }
      categoryDoc["slug"] = newSlug;
    }
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