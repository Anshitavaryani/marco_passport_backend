const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

// One stop in a passport. `position` is the visiting order (0-based),
// which is also the order the map draws the route in.
class PassportItem extends Model {}
PassportItem.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    passport_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      // The column kept its pre-rename name.
      field: "itinerary_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      references: {
        model: "itineraries",
        key: "id",
      },
    },
    place_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      references: {
        model: "places",
        key: "id",
      },
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    visit_date: {
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
    // Table, column and index names predate the rename to "passport"; the
    // DB was left as is. Keep tableName explicit (the default would be a new
    // `passport_items` table). Index `fields` are column names, not
    // attribute names.
    tableName: "itinerary_items",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["itinerary_id", "place_id"],
        name: "itinerary_items_itinerary_place_unique",
      },
      { fields: ["place_id"], name: "itinerary_items_place_id" },
    ],
  }
);

module.exports = PassportItem;
