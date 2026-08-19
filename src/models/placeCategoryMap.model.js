const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class PlaceCategoryMap extends Model {}
PlaceCategoryMap.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    place_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      // CASCADE here (not RESTRICT, unlike most FKs elsewhere in this
      // app) is deliberate: this is a pure join table. If a place or
      // category is ever hard-deleted, the mapping rows have no reason
      // to survive on their own — they're not independent data.
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      references: {
        model: "places",
        key: "id",
      },
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      references: {
        model: "place_categories",
        key: "id",
      },
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
    tableName: "place_category_map",
    timestamps: true,
    underscored: true,
    // No paranoid: true here — see the note above the model. Removing a
    // category tag from a place is a real deletion, not something this
    // app needs to soft-delete/undo.
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["place_id", "category_id"],
        name: "place_category_map_unique",
      },
    ],
  }
);

module.exports = PlaceCategoryMap;