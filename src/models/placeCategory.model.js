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
    // Matches Place.type — determines which listing pool this category
    // belongs to: 'business' (/explore's Places to Stay/Eat/Fun
    // Activities/Shopping/Local Services) or 'place' (/places' Beach/
    // Wildlife/Culture/Marina tags). Without this, nothing stops a
    // category meant for one pool being assigned to the wrong type of
    // listing, and /explore's category filter list would have no clean
    // way to show only its five categories instead of every category
    // in the table.
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
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    // Category card background image (see the "Explore by category"
    // homepage grid — each card has one).
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
  const existing = await this.findOne({ where: { slug, is_active: true } });
  return !!existing;
};

PlaceCategory.beforeDestroy(async (category) => {
  category.is_active = false;
});

module.exports = PlaceCategory;