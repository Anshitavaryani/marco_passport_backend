/** @format */

const httpStatus = require("http-status");
const { Op } = require("sequelize");
const {
  User,
  Profile,
  Review,
  Passport,
  PassportItem,
  Place,
} = require("../../models");
const ApiError = require("../../utils/ApiError");
const sequelize = require("../../config/central.db");

const getAllUsers = async (query) => {
  try {
    const { limit, offset, sortBy, search } = query;

    const where = { is_active: true };

    if (search) {
      where[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { "$user_profile.name$": { [Op.like]: `%${search}%` } },
      ];
    }

    const result = await User.findAndCountAll({
      attributes: [
        "id",
        "email",
        "role_id",
        "status",
        "created_at",
        [
          sequelize.literal(`(
            SELECT COUNT(*) FROM \`reviews\` r WHERE r.user_id = \`User\`.\`id\`
          )`),
          "reviews_count",
        ],
        // Passports live in the `itineraries` table, and the admin panel
        // reads the count as `itineraries_count`; both kept their old names.
        [
          sequelize.literal(`(
            SELECT COUNT(*) FROM \`itineraries\` i WHERE i.user_id = \`User\`.\`id\`
          )`),
          "itineraries_count",
        ],
      ],
      include: [
        {
          model: Profile,
          as: "user_profile",
          attributes: ["id", "name", "mobile", "is_active", "created_at"],
        },
      ],
      where: {
        [Op.and]: [
          where,
          sequelize.literal(`(
            EXISTS (SELECT 1 FROM \`reviews\` r WHERE r.user_id = \`User\`.\`id\`)
            OR EXISTS (SELECT 1 FROM \`itineraries\` i WHERE i.user_id = \`User\`.\`id\`)
          )`),
        ],
      },
      subQuery: false,
      distinct: true,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["id", sortBy]],
    });

    return result;
  } catch (error) {
    throw new ApiError(
      error.statusCode || httpStatus.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

const getUserById = async (id) => {
  const userDoc = await User.findOne({
    where: { id, is_active: true },
    attributes: ["id", "email", "role_id", "status", "created_at"],
    include: [
      {
        model: Profile,
        as: "user_profile",
        attributes: ["name", "mobile", "is_active", "created_at"],
      },
      {
        model: Review,
        as: "user_reviews",
        attributes: ["id", "place_id", "rating", "comment", "created_at"],
        include: [
          {
            model: Place,
            as: "review_place",
            attributes: ["id", "name", "type"],
            paranoid: false, // show even if the place was soft-deleted
          },
        ],
      },
      {
        model: Passport,
        as: "itineraries", // response key the admin panel reads
        attributes: ["id", "name", "start_date", "end_date", "created_at"],
        include: [
          {
            model: PassportItem,
            as: "items",
            attributes: ["id", "place_id", "position", "visit_date"],
            include: [
              {
                model: Place,
                as: "place",
                attributes: ["id", "name", "type"],
                paranoid: false, // show even if the place was soft-deleted
              },
            ],
          },
        ],
      },
    ],
  });

  if (!userDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return userDoc;
};

const deleteUsers = async (body) => {
  const t = await sequelize.transaction();
  try {
    if (!Array.isArray(body.user_id) || body.user_id.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user_id");
    }

    const userIds = body.user_id
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id));

    if (!userIds.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, "No valid user IDs provided");
    }

    const users = await User.findAll({ where: { id: userIds }, transaction: t });
    if (!users.length) {
      throw new ApiError(httpStatus.NOT_FOUND, "No users found");
    }

    await User.update(
      // Bulk update skips model hooks, so clear the email key here too.
      { is_active: false, deleted_at: new Date(), email_role_active_key: null },
      { where: { id: userIds }, transaction: t }
    );

    await t.commit();
    return { success: true, message: "User(s) deleted successfully" };
  } catch (error) {
    await t.rollback();
    throw new ApiError(
      error.statusCode || httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to delete users"
    );
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  deleteUsers,
};