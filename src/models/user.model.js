const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");
const { userStatusTypes } = require("../config/types");

class User extends Model {}
User.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
      references: {
        model: "roles",
        key: "id",
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    stripe_customer_id: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    socket_id: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    fcm_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // NOTE: column name typo ("reffral_id" -> "referral_id"). Not
    // renaming — this is a persisted column name, needs a coordinated
    // migration (RENAME COLUMN + update this attribute name together),
    // not a silent JS-side edit. Flagging so it's a deliberate fix later.
    reffral_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM,
      values: [
        userStatusTypes.ACCEPTED,
        userStatusTypes.PENDING,
        userStatusTypes.REJECTED,
        userStatusTypes.REVIEWED,
        userStatusTypes.REVIEWING,
      ],
      defaultValue: userStatusTypes.PENDING,
    },
    remember_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_proof_verify: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notification_status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    deleted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

User.afterCreate(async (user) => {
  const socketId = `${user.role_id}-${user.id}-socketId`;
  user.socket_id = socketId;
  user.user_name = await generateUniqueUserName(user.email, user.role_id);
  await user.save();
});

// Math.random() here is fine as-is — this is a display username, not a
// security token, so there's no reason to reach for crypto.randomInt
// the way randomStringGenerate.js needed to for password-reset tokens.
function generateRandomNumber() {
  return Math.floor(10000 + Math.random() * 90000);
}

// Was: transformEmail(email) — picked email-local-part + a random
// 5-digit suffix with NO collision check at all, despite
// User.isUserNameTaken() existing specifically to check this. With ~90k
// possible suffixes, two users sharing a common local-part (e.g. both
// named "john") collide with non-trivial odds once you have more than a
// handful of them — and a collision either throws unhandled (if
// user_name has a unique index) or silently creates a duplicate
// username (if it doesn't). Added a retry loop with a guaranteed-unique
// fallback.
async function generateUniqueUserName(email, roleId) {
  const base = email.split("@")[0];
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${base}${generateRandomNumber()}`;
    if (!(await User.isUserNameTaken(candidate, roleId))) {
      return candidate;
    }
  }
  return `${base}${Date.now()}`;
}

User.isEmailTaken = async function (email, role_id) {
  let u = await this.findOne({
    where: { email: email, role_id: role_id, is_active: true },
  });
  return !!u;
};

User.isUserNameTaken = async function (user_name, role_id) {
  let u_n = await this.findOne({
    where: { user_name: user_name, role_id: role_id, is_active: true },
  });
  return !!u_n;
};

// Removed: redundant beforeUpdate hook — see admin.model.js for why.

User.beforeDestroy(async (user) => {
  user.is_active = false;
});

module.exports = User;
