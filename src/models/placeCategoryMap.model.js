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
      // Pure join table: mapping rows go away with their place/category.
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
    // Not paranoid: removing a category tag is a real delete.
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