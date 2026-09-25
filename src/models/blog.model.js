const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class Blog extends Model {}
Blog.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
      references: {
        model: "blog_categories",
        key: "id",
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    // No longer unique:true — same soft-delete-vs-unique-constraint
    // issue as blog_categories/places/place_categories. Real
    // uniqueness now lives on slug_active below.
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    // Mirrors `slug` while the post is active, NULL once deleted, so a
    // soft-deleted post's old slug doesn't block a new post from
    // reusing it.
    slug_active: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    featured_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    written_by: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    read_time_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    deleted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "blogs",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  },
);

Blog.isSlugTaken = async function (slug) {
  const existing = await this.findOne({
    where: { slug_active: slug },
  });
  return !!existing;
};

Blog.beforeSave(async (blog) => {
  blog.slug_active = blog.is_active ? blog.slug : null;
});

Blog.beforeDestroy(async (blog) => {
  blog.is_active = false;
  blog.slug_active = null;
});

module.exports = Blog;