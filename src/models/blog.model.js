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
    // URL segment, e.g. "first-time-guide" -> /blog/first-time-guide.
    // Unique so two posts can't collide on the same public URL.
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    // Short summary — shown on the card grid AND doubles as the
    // meta/OG description. Distinct from `content`, which is the full
    // article body.
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Full article body (headings, images, pull-quotes). LONGTEXT since
    // rich content can exceed a plain TEXT column's ~64KB limit.
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    // Path/URL to the hero image, following the same convention as
    // user_attachments.file_uri elsewhere in this app.
    featured_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    written_by: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    // Stored rather than computed on every read — matches the "6 min
    // read" label. Whoever writes/publishes a post sets this (or a
    // service can estimate it from `content` length at save time).
    read_time_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Drives the single pinned "Featured" post at the top of the blog
    // index — the live site shows exactly one, but this doesn't enforce
    // that at the DB level; the service/controller layer should when we
    // get there.
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Separate from created_at — lets a post be scheduled or backdated
    // independently of when the row was actually inserted.
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
    where: { slug, is_active: true },
  });
  return !!existing;
};

Blog.beforeDestroy(async (blog) => {
  blog.is_active = false;
});

module.exports = Blog;
