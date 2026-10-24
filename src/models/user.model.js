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
    socket_id: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    fcm_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
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
    // Last password change or reset; another one isn't allowed until
    // PASSWORD_CHANGE_COOLDOWN_MS has passed (see auth.service.js).
    password_changed_at: {
      type: DataTypes.DATE,
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
    // "email:role_id" while the row is live, NULL once soft-deleted. The
    // unique index on it stops two live accounts sharing an email+role,
    // even under concurrent sign-ups (MySQL allows many NULLs).
    email_role_active_key: {
      type: DataTypes.STRING(210),
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
    indexes: [
      {
        unique: true,
        fields: ["email_role_active_key"],
        name: "users_email_role_active_unique",
      },
    ],
  }
);

User.beforeCreate(async (user) => {
  if (!user.user_name) {
    user.user_name = await generateUniqueUserName(user.email, user.role_id);
  }
});

// Display username suffix, not a security token — Math.random() is fine.
function generateRandomNumber() {
  return Math.floor(10000 + Math.random() * 90000);
}

// email local-part + random suffix, retried on collision, with a
// timestamp fallback that is always unique.
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

User.isUserNameTaken = async function (user_name, role_id) {
  let u_n = await this.findOne({
    where: { user_name: user_name, role_id: role_id, is_active: true },
  });
  return !!u_n;
};

User.beforeDestroy(async (user) => {
  // Soft delete saves with hooks off, so beforeSave won't clear the key.
  user.is_active = false;
  user.email_role_active_key = null;
});

User.beforeSave(async (user) => {
  user.email_role_active_key = user.deleted_at
    ? null
    : `${user.email}:${user.role_id}`;
});

module.exports = User;
