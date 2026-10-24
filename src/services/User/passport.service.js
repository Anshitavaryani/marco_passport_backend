const httpStatus = require("http-status");

const { Passport, PassportItem, Place } = require("../../models");
const sequelize = require("../../config/central.db");
const ApiError = require("../../utils/ApiError");

// Upper bound on stops per passport. Keeps the whole route drawable by a
// single Google Maps Embed "directions" iframe (origin + destination +
// waypoints), which is the free way the frontend shows the map.
const MAX_ITEMS = 20;
const MAX_NAME_LENGTH = 150;
const DEFAULT_NAME = "My passport";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Only what the passport screen and map need. The free Embed map locates
// each stop by "name, address", so no paid Google API call is ever needed.
const PLACE_ATTRIBUTES = [
  "id",
  "type",
  "name",
  "slug",
  "short_description",
  "featured_image",
  "address",
  "latitude",
  "longitude",
];

const badRequest = (message) => new ApiError(httpStatus.BAD_REQUEST, message);

// undefined = "not provided", null/"" = "clear it", otherwise YYYY-MM-DD.
const parseDate = (value, field) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw badRequest(`${field} must be a date in YYYY-MM-DD format.`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw badRequest(`${field} is not a valid date.`);
  }
  return value;
};

const parseName = (value) => {
  if (value === undefined) return undefined;
  const name = String(value || "").trim();
  if (!name) throw badRequest("name can't be empty.");
  if (name.length > MAX_NAME_LENGTH) {
    throw badRequest(`name can be at most ${MAX_NAME_LENGTH} characters.`);
  }
  return name;
};

const assertDateRange = (startDate, endDate) => {
  if (startDate && endDate && startDate > endDate) {
    throw badRequest("end_date can't be before start_date.");
  }
};

const parsePlaceId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw badRequest("Each item needs a valid place_id.");
  }
  return id;
};

// Validates an ordered list of { place_id, visit_date } and returns rows
// ready for bulkCreate (position = array index).
const parseItems = async (items) => {
  if (!Array.isArray(items)) {
    throw badRequest("items must be an array of { place_id, visit_date }.");
  }
  if (items.length > MAX_ITEMS) {
    throw badRequest(`A passport can have at most ${MAX_ITEMS} places.`);
  }

  const rows = items.map((item, index) => ({
    place_id: parsePlaceId(item?.place_id),
    visit_date: parseDate(item?.visit_date, `items[${index}].visit_date`) ?? null,
    position: index,
  }));

  const placeIds = rows.map((row) => row.place_id);
  if (new Set(placeIds).size !== placeIds.length) {
    throw badRequest("The same place can only be added once per passport.");
  }

  if (placeIds.length) {
    const found = await Place.count({
      where: { id: placeIds, is_active: true },
    });
    if (found !== placeIds.length) {
      throw badRequest("One or more places don't exist or are no longer listed.");
    }
  }
  return rows;
};

const findOwnedPassport = async (userId, id, options = {}) => {
  const passport = await Passport.findOne({
    where: { id, user_id: userId },
    ...options,
  });
  if (!passport) {
    throw new ApiError(httpStatus.NOT_FOUND, "Passport not found.");
  }
  return passport;
};

// Items whose place has since been unlisted (soft-deleted) are left out.
const toResponse = (passport) => {
  const json = passport.toJSON();
  json.items = (json.items || []).filter((item) => item.place);
  json.item_count = json.items.length;
  return json;
};

const getPassport = async (userId, id) => {
  const passport = await findOwnedPassport(userId, id, {
    include: [
      {
        model: PassportItem,
        as: "items",
        attributes: ["id", "place_id", "position", "visit_date"],
        include: [{ model: Place, as: "place", attributes: PLACE_ATTRIBUTES }],
      },
    ],
    order: [[{ model: PassportItem, as: "items" }, "position", "ASC"]],
  });
  return toResponse(passport);
};

const listPassports = async (userId) => {
  const passports = await Passport.findAll({
    where: { user_id: userId },
    attributes: ["id", "name", "start_date", "end_date", "created_at", "updated_at"],
    include: [
      {
        model: PassportItem,
        as: "items",
        attributes: ["id", "place_id", "position", "visit_date"],
        include: [
          {
            model: Place,
            as: "place",
            attributes: ["id", "name", "slug", "featured_image"],
          },
        ],
      },
    ],
    order: [
      ["updated_at", "DESC"],
      [{ model: PassportItem, as: "items" }, "position", "ASC"],
    ],
  });
  return passports.map(toResponse);
};

// Also how a guest's draft gets saved after the login popup: one request
// with the name and every place they picked.
const createPassport = async (userId, body) => {
  const name = parseName(body.name) || DEFAULT_NAME;
  const startDate = parseDate(body.start_date, "start_date") ?? null;
  const endDate = parseDate(body.end_date, "end_date") ?? null;
  assertDateRange(startDate, endDate);
  const items = await parseItems(body.items ?? []);

  const passport = await sequelize.transaction(async (transaction) => {
    const created = await Passport.create(
      { user_id: userId, name, start_date: startDate, end_date: endDate },
      { transaction }
    );
    if (items.length) {
      await PassportItem.bulkCreate(
        items.map((item) => ({ ...item, passport_id: created.id })),
        { transaction }
      );
    }
    return created;
  });
  return getPassport(userId, passport.id);
};

// Partial update. Sending `items` replaces the whole ordered list, which is
// how the edit screen saves reordering, removals and visit-date changes in
// one request.
const updatePassport = async (userId, id, body) => {
  const passport = await findOwnedPassport(userId, id);

  const name = parseName(body.name);
  const startDate = parseDate(body.start_date, "start_date");
  const endDate = parseDate(body.end_date, "end_date");
  if (name !== undefined) passport.name = name;
  if (startDate !== undefined) passport.start_date = startDate;
  if (endDate !== undefined) passport.end_date = endDate;
  assertDateRange(passport.start_date, passport.end_date);

  const items = body.items !== undefined ? await parseItems(body.items) : null;

  await sequelize.transaction(async (transaction) => {
    if (items) {
      await PassportItem.destroy({ where: { passport_id: passport.id }, transaction });
      if (items.length) {
        await PassportItem.bulkCreate(
          items.map((item) => ({ ...item, passport_id: passport.id })),
          { transaction }
        );
      }
      // Bump updated_at even if only the items changed.
      passport.changed("updated_at", true);
    }
    await passport.save({ transaction });
  });
  return getPassport(userId, passport.id);
};

// Appends one place (the "Add to passport" button on a listing page).
const addItem = async (userId, id, body) => {
  const passport = await findOwnedPassport(userId, id);
  const [item] = await parseItems([body]);

  const existing = await PassportItem.findAll({
    where: { passport_id: passport.id },
    attributes: ["place_id", "position"],
  });
  if (existing.some((row) => Number(row.place_id) === item.place_id)) {
    throw badRequest("This place is already in the passport.");
  }
  if (existing.length >= MAX_ITEMS) {
    throw badRequest(`A passport can have at most ${MAX_ITEMS} places.`);
  }

  const nextPosition = existing.reduce((max, row) => Math.max(max, row.position + 1), 0);
  await PassportItem.create({ ...item, passport_id: passport.id, position: nextPosition });
  passport.changed("updated_at", true);
  await passport.save();
  return getPassport(userId, passport.id);
};

const deletePassport = async (userId, id) => {
  const passport = await findOwnedPassport(userId, id);
  await sequelize.transaction(async (transaction) => {
    await PassportItem.destroy({ where: { passport_id: passport.id }, transaction });
    await passport.destroy({ transaction });
  });
};

module.exports = {
  MAX_ITEMS,
  listPassports,
  getPassport,
  createPassport,
  updatePassport,
  addItem,
  deletePassport,
};
