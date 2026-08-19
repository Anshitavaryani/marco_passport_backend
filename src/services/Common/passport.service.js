const httpStatus = require("http-status");

const { Passport, Place, PlaceCategory } = require("../../models");
const ApiError = require("../../utils/ApiError");

const addToPassport = async (user_id, place_id, visit_date) => {
  if (!place_id) {
    throw new ApiError(httpStatus.BAD_REQUEST, "place_id is required.");
  }

  const placeDoc = await Place.findOne({
    where: { id: place_id, is_active: true },
  });
  if (!placeDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
  }

  const existing = await Passport.findOne({ where: { user_id, place_id } });
  if (existing) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This place is already in your passport."
    );
  }

  return await Passport.create({
    user_id,
    place_id,
    visit_date: visit_date || null,
  });
};

const getPassportList = async (user_id) => {
  return await Passport.findAll({
    where: { user_id },
    include: [
      {
        model: Place,
        as: "passport_place",
        include: [
          {
            model: PlaceCategory,
            as: "categories",
            attributes: ["id", "name", "slug"],
            through: { attributes: [] },
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

const updateVisitDate = async (user_id, id, visit_date) => {
  const entry = await Passport.findOne({ where: { id, user_id } });
  if (!entry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Passport entry not found.");
  }
  entry.visit_date = visit_date || null;
  await entry.save();
  return entry;
};

const removeFromPassport = async (user_id, id) => {
  const entry = await Passport.findOne({ where: { id, user_id } });
  if (!entry) {
    throw new ApiError(httpStatus.NOT_FOUND, "Passport entry not found.");
  }
  await entry.destroy();
  return true;
};

module.exports = {
  addToPassport,
  getPassportList,
  updateVisitDate,
  removeFromPassport,
};