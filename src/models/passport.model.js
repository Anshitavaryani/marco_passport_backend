const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

// A user's passport: a trip plan ("My Passport" on the site). A user can
// have many.
class Passport extends Model {}
Passport.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
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
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
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
  },
  {
    sequelize,
    // Table and index names predate the rename to "passport"; the DB was
    // left as is. Keep tableName explicit: by default this model would map
    // to `passports`, the legacy pre-October table.
    tableName: "itineraries",
    timestamps: true,
    underscored: true,
    // Not paranoid: deleting a plan is a real delete (items cascade).
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["user_id"], name: "itineraries_user_id" }],
  }
);

module.exports = Passport;
