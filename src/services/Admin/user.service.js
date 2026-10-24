/** @format */

const httpStatus = require("http-status");
const { Op, fn, col, literal } = require("sequelize");
const {
  User,
  Profile,
  Review,
  Passport,
  PassportItem,
  Place,
  UserToken,
  userLoginTiming,
} = require("../../models");
const ApiError = require("../../utils/ApiError");
const sequelize = require("../../config/central.db");
const config = require("../../config/config");
const validateEmail = require("../../helpers/validateEmail");
const { userStatusTypes, tokenTypes } = require("../../config/types");

const MAX_LIMIT = 100;
const MAX_NAME_LENGTH = 150;
const MAX_MOBILE_LENGTH = 50;

const FILTERABLE_STATUSES = [
  userStatusTypes.ACCEPTED,
  userStatusTypes.PENDING,
  userStatusTypes.REJECTED,
];

// What an admin can set: ACCEPTED (active, e.g. verifying someone by hand)
// or REJECTED (blocked: login refuses anything but ACCEPTED). Never PENDING:
// the cleanup job hard-deletes PENDING accounts more than 24h old.
const ADMIN_SETTABLE_STATUSES = [
  userStatusTypes.ACCEPTED,
  userStatusTypes.REJECTED,
];

// Passports live in the `itineraries` table, and the admin panel reads the
// count as `itineraries_count`; both kept their old names.
const REVIEWS_COUNT = literal(
  "(SELECT COUNT(*) FROM `reviews` r WHERE r.user_id = `User`.`id` AND r.deleted_at IS NULL)"
);
const PASSPORTS_COUNT = literal(
  "(SELECT COUNT(*) FROM `itineraries` i WHERE i.user_id = `User`.`id`)"
);

// `id` last in each, so pages never overlap. Names sort with blanks last.
const USER_SORTS = {
  newest: [
    ["created_at", "DESC"],
    ["id", "DESC"],
  ],
  oldest: [
    ["created_at", "ASC"],
    ["id", "ASC"],
  ],
  name: [
    [literal("`user_profile`.`name` IS NULL"), "ASC"],
    [literal("`user_profile`.`name`"), "ASC"],
    ["id", "ASC"],
  ],
  passports: [
    [literal("`itineraries_count`"), "DESC"],
    ["id", "DESC"],
  ],
  reviews: [
    [literal("`reviews_count`"), "DESC"],
    ["id", "DESC"],
  ],
};

const badRequest = (message) => new ApiError(httpStatus.BAD_REQUEST, message);

const searchWhere = (search) =>
  search
    ? {
        [Op.or]: [
          { email: { [Op.like]: `%${search}%` } },
          { "$user_profile.name$": { [Op.like]: `%${search}%` } },
        ],
      }
    : {};

// Every live member, with how many reviews and passports each has.
// status_counts (for the filter tabs) honour the search but not the status.
const getAllUsers = async (query = {}) => {
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || config.defaultLimit, 1),
    MAX_LIMIT
  );
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const search = typeof query.search === "string" ? query.search.trim() : "";

  if (query.status && !FILTERABLE_STATUSES.includes(query.status)) {
    throw badRequest(`status must be one of: ${FILTERABLE_STATUSES.join(", ")}`);
  }

  // `sortBy=ASC|DESC` is the older way of asking for oldest/newest first.
  const sort = USER_SORTS[query.sort]
    ? query.sort
    : query.sortBy === "ASC"
      ? "oldest"
      : "newest";

  const where = { is_active: true, ...searchWhere(search) };

  const [result, statusRows] = await Promise.all([
    User.findAndCountAll({
      attributes: [
        "id",
        "email",
        "role_id",
        "status",
        "created_at",
        [REVIEWS_COUNT, "reviews_count"],
        [PASSPORTS_COUNT, "itineraries_count"],
      ],
      include: [
        {
          model: Profile,
          as: "user_profile",
          attributes: ["id", "name", "mobile", "is_active", "created_at"],
        },
      ],
      where: query.status ? { ...where, status: query.status } : where,
      subQuery: false,
      distinct: true,
      limit,
      offset: (page - 1) * limit,
      order: USER_SORTS[sort],
    }),
    User.findAll({
      attributes: ["status", [fn("COUNT", col("User.id")), "count"]],
      include: [{ model: Profile, as: "user_profile", attributes: [] }],
      where,
      group: ["User.status"],
      raw: true,
    }),
  ]);

  const status_counts = { all: 0, ACCEPTED: 0, PENDING: 0, REJECTED: 0 };
  statusRows.forEach((row) => {
    const count = Number(row.count);
    status_counts.all += count;
    if (row.status in status_counts) status_counts[row.status] = count;
  });

  return {
    count: result.count,
    rows: result.rows.map((row) => {
      const user = row.toJSON();
      user.reviews_count = Number(user.reviews_count) || 0;
      user.itineraries_count = Number(user.itineraries_count) || 0;
      return user;
    }),
    status_counts,
  };
};

const getUserById = async (id) => {
  const userDoc = await User.findOne({
    where: { id, is_active: true },
    attributes: ["id", "email", "role_id", "status", "created_at", "updated_at"],
    include: [
      {
        model: Profile,
        as: "user_profile",
        attributes: ["name", "mobile", "is_active", "created_at"],
      },
      {
        model: Review,
        as: "user_reviews",
        // Separate queries: joining reviews and passport items in one query
        // would multiply the rows.
        separate: true,
        attributes: ["id", "place_id", "rating", "comment", "created_at"],
        order: [["created_at", "DESC"]],
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
        separate: true,
        attributes: ["id", "name", "start_date", "end_date", "created_at"],
        order: [
          ["created_at", "DESC"],
          [{ model: PassportItem, as: "items" }, "position", "ASC"],
        ],
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

  const lastLogin = await userLoginTiming.max("login_time_utc", {
    where: { user_id: userDoc.id },
  });

  return { ...userDoc.toJSON(), last_login_at: lastLogin || null };
};

// An admin's edit of a member: name, email, mobile and status. Name and
// mobile live on the profile; the email is kept on both rows.
const updateUser = async (id, body = {}, adminId) => {
  const user = await User.findOne({ where: { id, is_active: true } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const { name, email, mobile, status } = body;

  if (status !== undefined && !ADMIN_SETTABLE_STATUSES.includes(status)) {
    throw badRequest(
      "status can only be set to ACCEPTED (active) or REJECTED (blocked)."
    );
  }

  let newEmail;
  if (email !== undefined) {
    newEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!newEmail || !validateEmail(newEmail)) {
      throw badRequest("Please enter a valid email address.");
    }
    if (newEmail !== user.email) {
      const taken = await User.findOne({
        where: {
          email: newEmail,
          role_id: user.role_id,
          is_active: true,
          id: { [Op.ne]: user.id },
        },
        attributes: ["id"],
      });
      if (taken) throw badRequest("Email already taken");
    }
  }

  let newName;
  if (name !== undefined) {
    newName = typeof name === "string" ? name.trim() : "";
    if (!newName) throw badRequest("Name can't be empty.");
    if (newName.length > MAX_NAME_LENGTH) {
      throw badRequest(`Name can be at most ${MAX_NAME_LENGTH} characters.`);
    }
  }

  let newMobile;
  if (mobile !== undefined) {
    newMobile = mobile === null ? null : String(mobile).trim() || null;
    if (newMobile && newMobile.length > MAX_MOBILE_LENGTH) {
      throw badRequest(
        `Mobile number can be at most ${MAX_MOBILE_LENGTH} characters.`
      );
    }
  }

  const blocking =
    status === userStatusTypes.REJECTED &&
    user.status !== userStatusTypes.REJECTED;

  await sequelize.transaction(async (transaction) => {
    if (newEmail !== undefined) user.email = newEmail;
    if (status !== undefined) user.status = status;
    if (adminId) user.updated_by = adminId;
    await user.save({ transaction });

    if (
      newName !== undefined ||
      newMobile !== undefined ||
      newEmail !== undefined
    ) {
      const [profile] = await Profile.findOrCreate({
        where: { user_id: user.id },
        defaults: { user_id: user.id, email: user.email },
        transaction,
      });
      if (newName !== undefined) profile.name = newName;
      if (newMobile !== undefined) profile.mobile = newMobile;
      if (newEmail !== undefined) profile.email = newEmail;
      await profile.save({ transaction });
    }

    // Blocked members are signed out now rather than when their token runs
    // out: every request checks the token row is still active.
    if (blocking) {
      await UserToken.update(
        { is_active: false },
        {
          where: {
            user_id: user.id,
            token_type: tokenTypes.ACCESS,
            is_active: true,
          },
          transaction,
        }
      );
    }
  });

  return getUserById(user.id);
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
  updateUser,
  deleteUsers,
};
