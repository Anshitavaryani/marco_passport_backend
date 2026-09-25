const httpStatus = require("http-status");
const slugify = require("slugify");

const { PlaceCategory } = require("../../models");
const ApiError = require("../../utils/ApiError");

const VALID_TYPES = ["business", "place"];

const createCategory = async (reqBody) => {
  const { name } = reqBody;

  if (!name) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please enter required field: [name]"
    );
  }

  const type = reqBody.type || "business";
  if (!VALID_TYPES.includes(type)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`
    );
  }

  const slug = reqBody.slug
    ? slugify(reqBody.slug, { lower: true, strict: true })
    : slugify(name, { lower: true, strict: true });

  if (!slug) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Unable to generate a valid category slug."
    );
  }

  if (await PlaceCategory.isSlugTaken(slug)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "A place category with this slug already exists."
    );
  }

  const categoryObj = {
    type,
    name,
    slug,
    image: reqBody.image || null,
    is_active:
      typeof reqBody.is_active !== "undefined" ? !!reqBody.is_active : true,
  };

  const categoryDoc = await PlaceCategory.create(categoryObj);

  if (!categoryDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new place category."
    );
  }

  return categoryDoc;
};

const updateCategory = async (reqBody, id) => {
  const categoryDoc = await PlaceCategory.findByPk(id);

  if (!categoryDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Place category not found.");
  }

  // ---------------------------------------------------------
  // Type
  // ---------------------------------------------------------
  if (reqBody.type) {
    if (!VALID_TYPES.includes(reqBody.type)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`
      );
    }

    categoryDoc.type = reqBody.type;
  }

  // ---------------------------------------------------------
  // Name
  // ---------------------------------------------------------
  const nameChanged =
    reqBody.name &&
    typeof reqBody.name !== "undefined" &&
    reqBody.name !== "" &&
    reqBody.name !== categoryDoc.name;

  if (nameChanged) {
    categoryDoc.name = reqBody.name;
  }

  // ---------------------------------------------------------
  // Slug
  //
  // If slug is explicitly provided, use it.
  // Otherwise, if name changed, regenerate slug from new name.
  // ---------------------------------------------------------
  const explicitSlug =
    reqBody.slug &&
    typeof reqBody.slug !== "undefined" &&
    reqBody.slug !== "";

  if (explicitSlug || nameChanged) {
    const newSlug = explicitSlug
      ? slugify(reqBody.slug, {
          lower: true,
          strict: true,
        })
      : slugify(reqBody.name, {
          lower: true,
          strict: true,
        });

    if (!newSlug) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Unable to generate a valid category slug."
      );
    }

    if (newSlug !== categoryDoc.slug) {
      if (await PlaceCategory.isSlugTaken(newSlug)) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "A place category with this slug already exists."
        );
      }

      categoryDoc.slug = newSlug;
    }
  }

  // ---------------------------------------------------------
  // Image
  // ---------------------------------------------------------
  if (typeof reqBody.image !== "undefined") {
    categoryDoc.image = reqBody.image;
  }

  // ---------------------------------------------------------
  // Active status
  // ---------------------------------------------------------
  if (typeof reqBody.is_active !== "undefined") {
    categoryDoc.is_active = !!reqBody.is_active;
  }

  await categoryDoc.save();

  return categoryDoc;
};

const getAllCategories = async (filters = {}) => {
  const where = { is_active: true };
  if (filters.type) {
    where.type = filters.type;
  }

  const categoryDocs = await PlaceCategory.findAll({
    where,
    order: [["name", "ASC"]],
  });

  return categoryDocs;
};

const findCategoryById = async (id) => {
  const categoryDoc = await PlaceCategory.findOne({
    where: { id, is_active: true },
  });

  return categoryDoc ? categoryDoc : [];
};

const deleteCategory = async (id) => {
  const categoryDoc = await PlaceCategory.findByPk(Number(id));

  if (!categoryDoc) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Place category not found."
    );
  }

  categoryDoc.is_active = false;
  categoryDoc.slug_active = null;

  await categoryDoc.save();

  await categoryDoc.destroy();

  return true;
};

module.exports = {
  createCategory,
  updateCategory,
  getAllCategories,
  findCategoryById,
  deleteCategory,
};