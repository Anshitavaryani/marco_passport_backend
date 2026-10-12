const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class PlaceCategory extends Model {}
PlaceCategory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    // Matches Place.type: 'business' categories for /explore, 'place'
    // categories for /places.
    type: {
      type: DataTypes.ENUM,
      values: ["business", "place"],
      allowNull: false,
      defaultValue: "business",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    // Not unique: uniqueness is enforced on slug_active instead.
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    slug_active: {
      type: DataTypes.STRING(150),
      allowNull: true,
      unique: true,
    },
    // Card background image for the "Explore by category" grid.
    image: {
      type: DataTypes.STRING(255),
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
    tableName: "place_categories",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

PlaceCategory.isSlugTaken = async function (slug) {
  const existing = await this.findOne({ where: { slug_active: slug } });
  return !!existing;
};

PlaceCategory.beforeSave(async (category) => {
  category.slug_active = category.is_active ? category.slug : null;
});

PlaceCategory.beforeDestroy(async (category) => {
  category.is_active = false;
  category.slug_active = null;
});

module.exports = PlaceCategory;