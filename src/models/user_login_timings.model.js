const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class userLoginTiming extends Model {}

userLoginTiming.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      references: {
        model: "roles",
        key: "id",
      },
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      references: {
        model: "users",
        key: "id",
      },
    },
    login_time_utc: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    logout_time_utc: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    login_time_local: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    logout_time_local: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    token_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      onDelete: "SET NULL",
      references: {
        model: "user_tokens",
        key: "id",
      },
    },
    // NOTE: this is a foreign key (references timezones.id — see
    // auth.service.js's saveLoginTiming, which stores timeZoneDoc.id
    // here), but every other FK column in this codebase uses an `_id`
    // suffix (role_id, user_id, country_id, token_id, etc). `time_zone`
    // reads like it might hold a name/string, not an id. Not renaming —
    // that's a persisted column name needing a coordinated migration —
    // just flagging the inconsistency (rename to timezone_id would match
    // the rest of the schema).
    time_zone: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "timezones",
        key: "id",
      },
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "user_login_timings",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

// Removed: redundant beforeUpdate hook — see admin.model.js for why.
// It also shadowed the outer `userLoginTiming` class with its own
// parameter (`(userLoginTiming) => {...}`), fixed below.

userLoginTiming.beforeDestroy(async (loginTiming) => {
  loginTiming.is_active = false;
});

module.exports = userLoginTiming;
