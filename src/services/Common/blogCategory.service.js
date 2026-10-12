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

  // An explicit slug wins; otherwise a name change regenerates the slug.
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

// Returns [] when not found (controller checks for it).
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