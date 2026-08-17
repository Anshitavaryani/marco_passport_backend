const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class Timezone extends Model {}
Timezone.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    time_zone: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    // NOTE: current_local_time / current_utc_offset /
    // is_day_light_saving_active look like a one-time snapshot from
    // whatever seeded timezones.sql, not something kept live-updated by
    // any cron/job in this codebase. DST offsets change through the
    // year, so these likely drift stale over time. auth.service.js's
    // saveLoginTiming (reviewed earlier) doesn't actually read these
    // columns — it just uses this table to resolve an id FK and does its
    // own live timezone conversion separately — so this is probably
    // harmless dead data rather than something actively relied on, but
    // worth confirming nothing else reads these expecting them to be current.
    current_local_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    current_utc_offset: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    standard_utc_offset: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    has_day_light_saving: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    is_day_light_saving_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
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
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "timezones",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

// Removed: redundant beforeUpdate hook — see admin.model.js for why.
// It also shadowed the outer `Timezone` class with its own parameter
// (`(Timezone) => {...}`), fixed below by lowercasing.

Timezone.beforeDestroy(async (timezone) => {
  timezone.is_active = false;
});

module.exports = Timezone;
