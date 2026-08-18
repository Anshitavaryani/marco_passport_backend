const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class BlogCategory extends Model {}
BlogCategory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    // Matches the URL-safe segment used in category filtering (e.g.
    // "Local Guides" -> "local-guides"). Unique so two categories can't
    // collide on the same public-facing slug.
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
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
    tableName: "blog_categories",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

BlogCategory.isSlugTaken = async function (slug) {
  const existing = await this.findOne({
    where: { slug, is_active: true },
  });
  return !!existing;
};

BlogCategory.beforeDestroy(async (category) => {
  category.is_active = false;
});

module.exports = BlogCategory;