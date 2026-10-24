const httpStatus = require("http-status");
const slugify = require("slugify");
const { Op, fn, col, literal } = require("sequelize");

const {
  Place,
  PlaceCategory,
  Review,
  Passport,
  PassportItem,
} = require("../../models");
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
const ADMIN_MAX_LIMIT = 100;

const COORDINATES_REQUIRED =
  "Set the location on the map: latitude and longitude are required.";
const COORDINATES_INVALID =
  "Latitude must be between -90 and 90 and longitude between -180 and 180.";

// Optional fields an admin can clear by sending "" (or null).
const NULLABLE_FIELDS = [
  "about",
  "phone",
  "email",
  "hours",
  "fees",
  "parking",
  "best_time_to_visit",
  "website_url",
  "neighborhood",
  "price_level",
  "top_pick_rank",
];

// How many passport stops point at a place, i.e. how often members saved
// it. `Place` is the alias Sequelize gives the places table in these queries.
const PASSPORT_COUNT = [
  literal(
    "(SELECT COUNT(*) FROM `itinerary_items` AS `ii` WHERE `ii`.`place_id` = `Place`.`id`)"
  ),
  "passport_count",
];

// Admin list orders; `id` is appended to every one so pages never overlap.
const ADMIN_SORTS = {
  updated: [["updated_at", "DESC"]],
  newest: [["created_at", "DESC"]],
  name: [["name", "ASC"]],
  rating: [
    ["rating", "DESC"],
    ["review_count", "DESC"],
  ],
  saves: [[literal("`passport_count`"), "DESC"]],
};

const badRequest = (message) => new ApiError(httpStatus.BAD_REQUEST, message);

const isBlank = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && !value.trim());

// "" from a cleared input means "remove it": saving "" would fail validation
// on the ENUM/INTEGER columns and leave junk in the text ones.
const optionalValue = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value.trim() || null;
  return value;
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return Boolean(value);
};

const parseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

// Accepts an array, a JSON array string or "1,2,3" (multipart forms).
const parseCategoryIds = (category_ids) => {
  if (isBlank(category_ids)) return [];
  let raw = category_ids;
  if (typeof category_ids === "string") {
    const parsed = parseJson(category_ids);
    raw = Array.isArray(parsed)
      ? parsed
      : category_ids
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
  }
  if (!Array.isArray(raw)) {
    throw badRequest("category_ids must be a list of category ids.");
  }
  const ids = raw.map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw badRequest("category_ids must be a list of category ids.");
  }
  return [...new Set(ids)];
};

const assertCategoriesValid = async (categoryIds, type) => {
  if (categoryIds.length === 0) return;
  const found = await PlaceCategory.findAll({
    where: { id: categoryIds, type, is_active: true },
  });
  if (found.length !== categoryIds.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "One or more category_ids are invalid or don't match this listing's type.",
    );
  }
};

const assertPriceLevel = (priceLevel) => {
  if (priceLevel && !VALID_PRICE_LEVELS.includes(priceLevel)) {
    throw badRequest(
      `Invalid price_level. Must be one of: ${VALID_PRICE_LEVELS.join(", ")}`,
    );
  }
};

// The 8-decimal string the DECIMAL columns hold; null when the value isn't
// a number or is out of range.
const parseCoordinate = (value, limit) => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n.toFixed(8) : null;
};

// Every listing needs a map position: the site's location cards and passport
// maps pin it there. 0,0 is what a failed lookup gives, never a real listing.
const parseCoordinates = (latitudeInput, longitudeInput) => {
  if (isBlank(latitudeInput) || isBlank(longitudeInput)) {
    throw badRequest(COORDINATES_REQUIRED);
  }
  const latitude = parseCoordinate(latitudeInput, 90);
  const longitude = parseCoordinate(longitudeInput, 180);
  if (latitude === null || longitude === null) {
    throw badRequest(COORDINATES_INVALID);
  }
  if (Number(latitude) === 0 && Number(longitude) === 0) {
    throw badRequest(COORDINATES_REQUIRED);
  }
  return { latitude, longitude };
};

const cleanTextItem = (item) => {
  if (typeof item !== "string" && typeof item !== "number") return [];
  const text = String(item).trim();
  return text ? [text] : [];
};

const cleanExpectItem = (item) => {
  if (!item || typeof item !== "object") return [];
  const title = typeof item.title === "string" ? item.title.trim() : "";
  if (!title) return [];
  const description =
    typeof item.description === "string" ? item.description.trim() : "";
  return [{ title, description }];
};

// highlights / insider_tips / what_to_expect arrive as arrays (JSON body) or
// JSON strings (multipart forms); either way the JSON column gets a real
// array. Text that isn't a JSON list is kept as is: older rows hold plain
// text, which the site still splits into lines. Empty lists become null.
const toJsonList = (value, field, cleanItem) => {
  if (isBlank(value)) return null;
  let list = value;
  if (typeof value === "string") {
    const parsed = parseJson(value);
    if (!Array.isArray(parsed)) return parsed === null ? null : value.trim();
    list = parsed;
  }
  if (!Array.isArray(list)) {
    throw badRequest(`${field} must be a list.`);
  }
  const items = list.flatMap(cleanItem);
  return items.length ? items : null;
};

const LIST_FIELDS = {
  highlights: cleanTextItem,
  insider_tips: cleanTextItem,
  what_to_expect: cleanExpectItem,
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

// Which of these places are already in any of the user's passports.
// Responses expose this as `is_in_itinerary`, a key that kept its old name.
const placeIdsInUserPassports = async (userId, placeIds) => {
  if (!placeIds.length) return new Set();
  const rows = await PassportItem.findAll({
    where: { place_id: placeIds },
    attributes: ["place_id"],
    include: [
      {
        model: Passport,
        as: "passport",
        where: { user_id: userId },
        attributes: [],
      },
    ],
    raw: true,
  });
  return new Set(rows.map((row) => row.place_id));
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
    { where: { id: placeId } },
  );
};

const createPlace = async (reqBody) => {
  const type = reqBody.type || "business";

  if (!VALID_TYPES.includes(type)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
    );
  }

  const name = typeof reqBody.name === "string" ? reqBody.name.trim() : "";
  const short_description =
    typeof reqBody.short_description === "string"
      ? reqBody.short_description.trim()
      : "";
  // The address is shown on the listing and in passports, so every listing
  // needs one alongside its coordinates.
  const address = typeof reqBody.address === "string" ? reqBody.address.trim() : "";
  if (!name || !short_description || !address) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please enter required fields: [name, short_description, address]",
    );
  }

  const { latitude, longitude } = parseCoordinates(
    reqBody.latitude,
    reqBody.longitude,
  );

  const priceLevel = optionalValue(reqBody.price_level) ?? null;
  assertPriceLevel(priceLevel);

  const categoryIds = parseCategoryIds(reqBody.category_ids);
  await assertCategoriesValid(categoryIds, type);

  const slug = reqBody.slug
    ? slugify(reqBody.slug, { lower: true, strict: true })
    : slugify(name, { lower: true, strict: true });

  if (!slug) {
    throw badRequest("Unable to generate a valid listing slug.");
  }

  if (await Place.isSlugTaken(slug)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "A listing with this slug already exists.",
    );
  }

  const placeObj = {
    type,
    name,
    slug,
    short_description,
    about: optionalValue(reqBody.about) ?? null,
    highlights: toJsonList(reqBody.highlights, "highlights", cleanTextItem),
    what_to_expect: toJsonList(
      reqBody.what_to_expect,
      "what_to_expect",
      cleanExpectItem,
    ),
    insider_tips: toJsonList(reqBody.insider_tips, "insider_tips", cleanTextItem),
    featured_image: reqBody.featured_image || null,
    gallery_images: reqBody.gallery_images || null,
    address,
    phone: optionalValue(reqBody.phone) ?? null,
    email: optionalValue(reqBody.email) ?? null,
    hours: optionalValue(reqBody.hours) ?? null,
    fees: optionalValue(reqBody.fees) ?? null,
    parking: optionalValue(reqBody.parking) ?? null,
    best_time_to_visit: optionalValue(reqBody.best_time_to_visit) ?? null,
    website_url: optionalValue(reqBody.website_url) ?? null,
    latitude,
    longitude,
    price_level: priceLevel,
    neighborhood: optionalValue(reqBody.neighborhood) ?? null,
    is_featured: parseBoolean(reqBody.is_featured),
    is_top_pick: parseBoolean(reqBody.is_top_pick),

    top_pick_rank: optionalValue(reqBody.top_pick_rank) ?? null,
    created_by: reqBody.created_by || null,
  };

  const placeDoc = await Place.create(placeObj);
  if (!placeDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new listing",
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

  if (reqBody.type && !VALID_TYPES.includes(reqBody.type)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
    );
  }

  const type = reqBody.type || placeDoc.type;
  const typeChanged = type !== placeDoc.type;

  // -------------------------------------------------------------
  // Name
  // -------------------------------------------------------------

  const name = typeof reqBody.name === "string" ? reqBody.name.trim() : "";
  const nameChanged = name !== "" && name !== placeDoc.name;

  if (nameChanged) {
    placeDoc.name = name;
  }

  // -------------------------------------------------------------
  // Slug
  //
  // If slug is explicitly supplied -> use it.
  // Otherwise, if name changed -> regenerate slug from name.
  // -------------------------------------------------------------

  const explicitSlug =
    typeof reqBody.slug !== "undefined" && reqBody.slug !== "";

  if (explicitSlug || nameChanged) {
    const newSlug = explicitSlug
      ? slugify(reqBody.slug, {
          lower: true,
          strict: true,
        })
      : slugify(name, {
          lower: true,
          strict: true,
        });

    if (!newSlug) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Unable to generate a valid listing slug.",
      );
    }

    if (newSlug !== placeDoc.slug) {
      if (await Place.isSlugTaken(newSlug)) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "A listing with this slug already exists.",
        );
      }

      placeDoc.slug = newSlug;
    }
  }

  // -------------------------------------------------------------
  // Required text, location and other fields
  // -------------------------------------------------------------

  if (typeof reqBody.short_description !== "undefined") {
    if (isBlank(reqBody.short_description)) {
      throw badRequest("short_description can't be empty.");
    }
    placeDoc.short_description = String(reqBody.short_description).trim();
  }

  if (typeof reqBody.address !== "undefined") {
    if (isBlank(reqBody.address)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "address can't be empty.");
    }
    placeDoc.address = String(reqBody.address).trim();
  }

  // Coordinates can be moved but never removed; either one alone is checked
  // against the other's saved value.
  if (
    typeof reqBody.latitude !== "undefined" ||
    typeof reqBody.longitude !== "undefined"
  ) {
    const { latitude, longitude } = parseCoordinates(
      typeof reqBody.latitude !== "undefined" ? reqBody.latitude : placeDoc.latitude,
      typeof reqBody.longitude !== "undefined" ? reqBody.longitude : placeDoc.longitude,
    );
    placeDoc.latitude = latitude;
    placeDoc.longitude = longitude;
  }

  NULLABLE_FIELDS.forEach((field) => {
    if (typeof reqBody[field] === "undefined") return;
    placeDoc[field] = optionalValue(reqBody[field]);
  });
  assertPriceLevel(placeDoc.price_level);

  Object.entries(LIST_FIELDS).forEach(([field, cleanItem]) => {
    if (typeof reqBody[field] !== "undefined") {
      placeDoc[field] = toJsonList(reqBody[field], field, cleanItem);
    }
  });

  if (typeof reqBody.featured_image !== "undefined") {
    placeDoc.featured_image = reqBody.featured_image || null;
  }

  if (typeof reqBody.gallery_images !== "undefined") {
    placeDoc.gallery_images = reqBody.gallery_images;
  }
  if (typeof reqBody.is_featured !== "undefined") {
    placeDoc.is_featured = parseBoolean(reqBody.is_featured);
  }

  if (typeof reqBody.is_top_pick !== "undefined") {
    placeDoc.is_top_pick = parseBoolean(reqBody.is_top_pick);
  }

  if (reqBody.type) {
    placeDoc.type = reqBody.type;
  }

  if (reqBody.updated_by) {
    placeDoc.updated_by = reqBody.updated_by;
  }

  // Validated before saving, so a bad list doesn't leave a half-saved edit.
  const categoryIds =
    typeof reqBody.category_ids !== "undefined"
      ? parseCategoryIds(reqBody.category_ids)
      : null;
  if (categoryIds) {
    await assertCategoriesValid(categoryIds, type);
  }

  await placeDoc.save();

  // -------------------------------------------------------------
  // Categories
  //
  // category_ids replaces the list. Without it, a type change drops the
  // categories of the old type (a listing's categories must match its type).
  // -------------------------------------------------------------

  if (categoryIds) {
    await placeDoc.setCategories(categoryIds);
  } else if (typeChanged) {
    const current = await placeDoc.getCategories({ attributes: ["id", "type"] });
    await placeDoc.setCategories(
      current.filter((category) => category.type === type).map((category) => category.id),
    );
  }

  return findPlaceById(placeDoc.id);
};

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
    const saved = await placeIdsInUserPassports(
      userId,
      places.map((p) => p.id)
    );
    places = places.map((p) => ({ ...p, is_in_itinerary: saved.has(p.id) }));
  }

  return {
    total: count,
    page,
    limit,
    total_pages: Math.ceil(count / limit),
    places,
  };
};

const withPassportCount = (placeDoc) => {
  const place = placeDoc.toJSON();
  place.passport_count = Number(place.passport_count) || 0;
  return place;
};

// The admin list: both types together (or one), every category a listing has
// (filtering by category doesn't trim the others), and per-type counts for
// the type tabs, which ignore the type filter but honour all the others.
const getAllPlacesAdmin = async (filters = {}) => {
  let type = null;
  if (filters.type && filters.type !== "all") {
    if (!VALID_TYPES.includes(filters.type)) {
      throw badRequest(`Invalid type. Must be one of: all, ${VALID_TYPES.join(", ")}`);
    }
    type = filters.type;
  }

  const conditions = [{ is_active: true }];

  const search = typeof filters.search === "string" ? filters.search.trim() : "";
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    conditions.push({
      [Op.or]: [{ name: like }, { address: like }, { neighborhood: like }],
    });
  }

  if (filters.category_id) {
    const categoryId = Number(filters.category_id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw badRequest("category_id must be a category id.");
    }
    conditions.push(
      literal(
        `\`Place\`.\`id\` IN (SELECT \`place_id\` FROM \`place_category_map\` WHERE \`category_id\` = ${categoryId})`
      ),
    );
  }

  if (filters.coordinates === "missing") {
    conditions.push({ [Op.or]: [{ latitude: null }, { longitude: null }] });
  }

  if (filters.featured === "true" || filters.featured === "false") {
    conditions.push({ is_featured: filters.featured === "true" });
  }

  const limit = Math.min(
    Math.max(parseInt(filters.limit, 10) || config.defaultLimit, 1),
    ADMIN_MAX_LIMIT,
  );
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);

  const [{ count, rows }, typeCounts] = await Promise.all([
    Place.findAndCountAll({
      where: { [Op.and]: type ? [...conditions, { type }] : conditions },
      attributes: { include: [PASSPORT_COUNT] },
      include: [CATEGORY_INCLUDE],
      order: [...(ADMIN_SORTS[filters.sort] || ADMIN_SORTS.updated), ["id", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    }),
    Place.count({ where: { [Op.and]: conditions }, group: ["type"] }),
  ]);

  const counts = { all: 0, place: 0, business: 0 };
  typeCounts.forEach((row) => {
    counts[row.type] = Number(row.count);
    counts.all += Number(row.count);
  });

  return {
    total: count,
    page,
    limit,
    total_pages: Math.ceil(count / limit),
    places: rows.map(withPassportCount),
    counts,
  };
};

const findPlaceById = async (id) => {
  const placeDoc = await Place.findOne({
    where: { id, is_active: true },
    attributes: { include: [PASSPORT_COUNT] },
    include: [CATEGORY_INCLUDE],
  });
  return placeDoc ? withPassportCount(placeDoc) : [];
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
    const saved = await placeIdsInUserPassports(userId, [placeDoc.id]);
    result.is_in_itinerary = saved.has(placeDoc.id);
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
  getAllPlacesAdmin,
  findPlaceById,
  findPlaceBySlug,
  deletePlace,
  recalculatePlaceRating,
};
