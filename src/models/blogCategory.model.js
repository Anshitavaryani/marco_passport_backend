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
    // No longer unique:true here — a blanket unique constraint on this
    // raw column blocked recreating a category with the same slug
    // after a soft-delete, since the old (soft-deleted) row still
    // physically exists with that slug. The real uniqueness constraint
    // now lives on slug_active below, which is NULL for inactive rows
    // and MySQL allows unlimited NULLs in a unique index.
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    // Mirrors `slug` when the category is active, NULL when it isn't
    // (see beforeSave/beforeDestroy below). This — not `slug` — is
    // what actually carries the unique constraint, so a soft-deleted
    // category's old slug doesn't block a new category from reusing
    // it.
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