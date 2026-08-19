const httpStatus = require("http-status");
const slugify = require("slugify");
const { Op, fn, col } = require("sequelize");

const { Place, PlaceCategory, Review, Passport } = require("../../models");
const config = require("../../config/config");
const ApiError = require("../../utils/ApiError");

const CATEGORY_INCLUDE = {
  model: PlaceCategory,
  as: "categories",
  attributes: ["id", "name", "slug", "type"],
  through: { attributes: [] },
};

const VALID_TYPES = ["business", "place"];
const VALID_PRICE_LEVELS = ["$", "$$", "$$$", "$$$$"];

const parseCategoryIds = (category_ids) => {
  if (!category_ids) return [];
  if (Array.isArray(category_ids)) return category_ids.map(Number);
  return String(category_ids)
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => !Number.isNaN(id) && id > 0);
};

const assertCategoriesValid = async (categoryIds, type) => {
  if (categoryIds.length === 0) return;
  const found = await PlaceCategory.findAll({
    where: { id: categoryIds, type, is_active: true },
  });
  if (found.length !== categoryIds.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "One or more category_ids are invalid or don't match this listing's type."
    );
  }
};

const getSortOrder = (type, sort) => {
  if (type === "place") {
    return [
      ["is_top_pick", "DESC"],
      ["top_pick_rank", "ASC"],
      ["name", "ASC"],
    ];
  }
  switch (sort) {
    case "rating":
      return [["rating", "DESC"]];
    case "newest":
      return [["created_at", "DESC"]];
    case "featured":
    default:
      return [
        ["is_featured", "DESC"],
        ["rating", "DESC"],
      ];
  }
};

const recalculatePlaceRating = async (placeId) => {
  const result = await Review.findOne({
    where: { place_id: placeId, is_active: true },
    attributes: [
      [fn("AVG", col("rating")), "avg_rating"],
      [fn("COUNT", col("id")), "review_count"],
    ],
    raw: true,
  });

  const avgRating = result?.avg_rating
    ? Number(result.avg_rating).toFixed(1)
    : null;
  const reviewCount = Number(result?.review_count) || 0;

  await Place.update(
    { rating: avgRating, review_count: reviewCount },
    { where: { id: placeId } }
  );
};

const createPlace = async (reqBody) => {
  const { name, short_description } = reqBody;
  const type = reqBody.type || "business";

  if (!VALID_TYPES.includes(type)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`
    );
  }

  if (!name || !short_description) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please enter required fields: [name, short_description]"
    );
  }

  if (reqBody.price_level && !VALID_PRICE_LEVELS.includes(reqBody.price_level)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid price_level. Must be one of: ${VALID_PRICE_LEVELS.join(", ")}`
    );
  }

  const categoryIds = parseCategoryIds(reqBody.category_ids);
  await assertCategoriesValid(categoryIds, type);

  const slug = reqBody.slug
    ? slugify(reqBody.slug, { lower: true, strict: true })
    : slugify(name, { lower: true, strict: true });

  if (await Place.isSlugTaken(slug)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "A listing with this slug already exists."
    );
  }

  const placeObj = {
    type,
    name,
    slug,
    tagline: reqBody.tagline || null,
    short_description,
    about: reqBody.about || null,
    highlights: reqBody.highlights || null,
    featured_image: reqBody.featured_image || null,
    gallery_images: reqBody.gallery_images || null,
    address: reqBody.address || null,
    phone: reqBody.phone || null,
    email: reqBody.email || null,
    hours: reqBody.hours || null,
    website_url: reqBody.website_url || null,
    latitude: reqBody.latitude || null,
    longitude: reqBody.longitude || null,
    price_level: reqBody.price_level || null,
    neighborhood: reqBody.neighborhood || null,
    is_featured: !!reqBody.is_featured,
    is_top_pick: !!reqBody.is_top_pick,
    top_pick_rank: reqBody.top_pick_rank || null,
    created_by: reqBody.created_by || null,
  };

  const placeDoc = await Place.create(placeObj);
  if (!placeDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new listing"
    );
  }

  if (categoryIds.length) {
    await placeDoc.setCategories(categoryIds);
  }

  return findPlaceById(placeDoc.id);
};

const updatePlace = async (reqBody, id) => {
  const placeDoc = await Place.findByPk(id);
  if (!placeDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Listing not found");
  }

  const type = reqBody.type || placeDoc.type;
  if (reqBody.type && !VALID_TYPES.includes(reqBody.type)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`
    );
  }

  if (reqBody.price_level && !VALID_PRICE_LEVELS.includes(reqBody.price_level)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid price_level. Must be one of: ${VALID_PRICE_LEVELS.join(", ")}`
    );
  }

  const simpleFields = [
    "name",
    "tagline",
    "short_description",
    "about",
    "highlights",
    "address",
    "phone",
    "email",
    "hours",
    "website_url",
    "latitude",
    "longitude",
    "price_level",
    "neighborhood",
    "top_pick_rank",
  ];
  simpleFields.forEach((field) => {
    if (typeof reqBody[field] !== "undefined") {
      placeDoc[field] = reqBody[field];
    }
  });

  if (typeof reqBody.featured_image !== "undefined") {
    placeDoc.featured_image = reqBody.featured_image;
  }

  if (typeof reqBody.gallery_images !== "undefined") {
    placeDoc.gallery_images = reqBody.gallery_images;
  }

  if (typeof reqBody.is_featured !== "undefined") {
    placeDoc.is_featured = !!reqBody.is_featured;
  }

  if (typeof reqBody.is_top_pick !== "undefined") {
    placeDoc.is_top_pick = !!reqBody.is_top_pick;
  }

  if (reqBody.type) {
    placeDoc.type = reqBody.type;
  }

  if (reqBody.slug) {
    const newSlug = slugify(reqBody.slug, { lower: true, strict: true });
    if (newSlug !== placeDoc.slug && (await Place.isSlugTaken(newSlug))) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "A listing with this slug already exists."
      );
    }
    placeDoc.slug = newSlug;
  }

  if (reqBody.updated_by) {
    placeDoc.updated_by = reqBody.updated_by;
  }

  await placeDoc.save();

  if (typeof reqBody.category_ids !== "undefined") {
    const categoryIds = parseCategoryIds(reqBody.category_ids);
    await assertCategoriesValid(categoryIds, type);
    await placeDoc.setCategories(categoryIds);
  }

  return findPlaceById(placeDoc.id);
};

// userId is optional — when provided (a logged-in visitor, via
// attachUserIfPresent on the public routes), each place in the result
// gets an is_in_passport boolean. Anonymous requests (userId
// undefined) skip this entirely and just don't include the field.
const getAllPlaces = async (filters = {}, userId) => {
  const type = filters.type || "business";
  const where = { is_active: true, type };

  if (filters.price_level) {
    where.price_level = filters.price_level;
  }
  if (filters.neighborhood) {
    where.neighborhood = filters.neighborhood;
  }
  if (typeof filters.is_featured !== "undefined") {
    where.is_featured = filters.is_featured;
  }
  if (typeof filters.is_top_pick !== "undefined") {
    where.is_top_pick = filters.is_top_pick;
  }
  if (filters.min_rating) {
    where.rating = { [Op.gte]: filters.min_rating };
  }
  if (filters.search) {
    where.name = { [Op.like]: `%${filters.search}%` };
  }

  const include = [{ ...CATEGORY_INCLUDE }];
  if (filters.category_id) {
    include[0] = {
      ...CATEGORY_INCLUDE,
      where: { id: filters.category_id },
      required: true,
    };
  }

  const limit = Number(filters.limit) || config.defaultLimit;
  const page = Number(filters.page) || 1;
  const offset = (page - 1) * limit;

  const { count, rows } = await Place.findAndCountAll({
    where,
    include,
    order: getSortOrder(type, filters.sort),
    limit,
    offset,
    distinct: true,
  });

  let places = rows.map((row) => row.toJSON());

  if (userId) {
    const savedPlaceIds = await Passport.findAll({
      where: { user_id: userId, place_id: places.map((p) => p.id) },
      attributes: ["place_id"],
      raw: true,
    });
    const savedSet = new Set(savedPlaceIds.map((p) => p.place_id));
    places = places.map((p) => ({
      ...p,
      is_in_passport: savedSet.has(p.id),
    }));
  }

  return {
    total: count,
    page,
    limit,
    total_pages: Math.ceil(count / limit),
    places,
  };
};

const findPlaceById = async (id) => {
  const placeDoc = await Place.findOne({
    where: { id, is_active: true },
    include: [CATEGORY_INCLUDE],
  });
  return placeDoc ? placeDoc : [];
};

const findPlaceBySlug = async (slug, expectedType, userId) => {
  const placeDoc = await Place.findOne({
    where: { slug, is_active: true },
    include: [CATEGORY_INCLUDE],
  });

  if (!placeDoc) return [];
  if (expectedType && placeDoc.type !== expectedType) return [];

  const categoryIds = placeDoc.categories.map((c) => c.id);
  let similarPlaces = [];
  if (categoryIds.length) {
    similarPlaces = await Place.findAll({
      where: {
        id: { [Op.ne]: placeDoc.id },
        type: placeDoc.type,
        is_active: true,
      },
      include: [
        {
          ...CATEGORY_INCLUDE,
          where: { id: categoryIds },
          required: true,
        },
      ],
      limit: 3,
      order: [["rating", "DESC"]],
    });
  }

  const result = placeDoc.toJSON();
  result.similar_places = similarPlaces;

  if (userId) {
    const savedEntry = await Passport.findOne({
      where: { user_id: userId, place_id: placeDoc.id },
    });
    result.is_in_passport = !!savedEntry;
  }

  return result;
};

const deletePlace = async (id) => {
  const placeDoc = await Place.findByPk(Number(id));
  if (!placeDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Listing not found");
  }
  return await placeDoc.destroy();
};

module.exports = {
  createPlace,
  updatePlace,
  getAllPlaces,
  findPlaceById,
  findPlaceBySlug,
  deletePlace,
  recalculatePlaceRating,
};