/** @format */

const httpStatus = require("http-status");
const { Op, literal } = require("sequelize");

const { Passport, PassportItem, Place, User, Profile } = require("../../models");
const ApiError = require("../../utils/ApiError");
const config = require("../../config/config");

const MAX_LIMIT = 100;

// Stops in a passport, including places unlisted since: what the member
// saved. `Passport` is the alias Sequelize gives the itineraries table.
const PASSPORT_ITEM_COUNT = literal(
  "(SELECT COUNT(*) FROM `itinerary_items` ii WHERE ii.itinerary_id = `Passport`.`id`)"
);

// `id` last in each, so pages never overlap.
const PASSPORT_SORTS = {
  newest: [
    ["created_at", "DESC"],
    ["id", "DESC"],
  ],
  updated: [
    ["updated_at", "DESC"],
    ["id", "DESC"],
  ],
  places: [
    [literal("`item_count`"), "DESC"],
    ["id", "DESC"],
  ],
};

// Owners are shown even after their account was deleted, flagged as such.
const OWNER_INCLUDE = {
  model: User,
  as: "owner",
  attributes: ["id", "email", "deleted_at"],
  paranoid: false,
  include: [
    {
      model: Profile,
      as: "user_profile",
      attributes: ["name"],
      paranoid: false,
    },
  ],
};

const toOwner = (owner) =>
  owner
    ? {
        id: owner.id,
        email: owner.email,
        deleted: Boolean(owner.deleted_at),
        user_profile: { name: owner.user_profile?.name ?? null },
      }
    : null;

// Every member's passports, for the admin Passports screen. ?search= matches
// the passport name and the owner's email or name.
const listPassports = async (query = {}) => {
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || config.defaultLimit, 1),
    MAX_LIMIT
  );
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const search = typeof query.search === "string" ? query.search.trim() : "";

  const where = {};
  if (query.user_id) {
    const userId = Number(query.user_id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "user_id must be a user id.");
    }
    where.user_id = userId;
  }
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    where[Op.or] = [
      { name: like },
      { "$owner.email$": like },
      { "$owner.user_profile.name$": like },
    ];
  }

  const { count, rows } = await Passport.findAndCountAll({
    where,
    attributes: [
      "id",
      "name",
      "start_date",
      "end_date",
      "created_at",
      "updated_at",
      [PASSPORT_ITEM_COUNT, "item_count"],
    ],
    include: [OWNER_INCLUDE],
    // Owner and profile are one row each, so a flat join pages correctly
    // and lets ?search= reach their columns.
    subQuery: false,
    distinct: true,
    limit,
    offset: (page - 1) * limit,
    order: PASSPORT_SORTS[query.sort] || PASSPORT_SORTS.newest,
  });

  return {
    total: count,
    page,
    limit,
    total_pages: Math.ceil(count / limit),
    passports: rows.map((row) => {
      const passport = row.toJSON();
      return {
        id: passport.id,
        name: passport.name,
        start_date: passport.start_date,
        end_date: passport.end_date,
        created_at: passport.created_at,
        updated_at: passport.updated_at,
        item_count: Number(passport.item_count) || 0,
        owner: toOwner(passport.owner),
      };
    }),
  };
};

const getPassport = async (id) => {
  const passportDoc = await Passport.findOne({
    where: { id },
    attributes: ["id", "name", "start_date", "end_date", "created_at", "updated_at"],
    include: [
      OWNER_INCLUDE,
      {
        model: PassportItem,
        as: "items",
        attributes: ["id", "position", "visit_date"],
        include: [
          {
            model: Place,
            as: "place",
            attributes: ["id", "name", "type", "slug", "address", "featured_image", "deleted_at"],
            paranoid: false, // show even if the place was unlisted since
          },
        ],
      },
    ],
    order: [[{ model: PassportItem, as: "items" }, "position", "ASC"]],
  });

  if (!passportDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Passport not found.");
  }

  const passport = passportDoc.toJSON();
  return {
    id: passport.id,
    name: passport.name,
    start_date: passport.start_date,
    end_date: passport.end_date,
    created_at: passport.created_at,
    updated_at: passport.updated_at,
    item_count: passport.items.length,
    owner: toOwner(passport.owner),
    items: passport.items.map((item) => ({
      id: item.id,
      position: item.position,
      visit_date: item.visit_date,
      place: item.place
        ? {
            id: item.place.id,
            name: item.place.name,
            type: item.place.type,
            slug: item.place.slug,
            address: item.place.address,
            featured_image: item.place.featured_image,
            deleted: Boolean(item.place.deleted_at),
          }
        : null,
    })),
  };
};

module.exports = {
  PASSPORT_ITEM_COUNT,
  listPassports,
  getPassport,
};
