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
    // Not unique: uniqueness is enforced on slug_active instead.
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    // Mirrors slug while active, NULL once deleted, so a deleted row's
    // slug can be reused (MySQL allows many NULLs in a unique index).
    slug_active: {
      type: DataTypes.STRING(150),
      allowNull: true,
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
    where: { slug_active: slug },
  });
  return !!existing;
};

BlogCategory.beforeSave(async (category) => {
  category.slug_active = category.is_active ? category.slug : null;
});

BlogCategory.beforeDestroy(async (category) => {
  category.is_active = false;
  category.slug_active = null;
});

module.exports = BlogCategory;