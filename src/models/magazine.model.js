const { Sequelize, DataTypes, Model } = require("sequelize");

const sequelize = require("../config/central.db");

// A magazine issue from the admin's magazine builder. `pages` is the issue
// itself, an ordered list of { id, layout, content }; magazine.service.js
// checks it but doesn't need to understand the layouts.
class Magazine extends Model {}

Magazine.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    // Not unique: uniqueness is enforced on slug_active instead.
    slug: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    // Mirrors slug while live, NULL once deleted, so a deleted issue's
    // address can be reused (MySQL allows many NULLs in a unique index).
    slug_active: {
      type: DataTypes.STRING(160),
      allowNull: true,
      unique: "magazines_slug_active_unique",
    },
    // e.g. "Issue 07"
    issue_label: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    // e.g. "Fall 2026"
    season: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    // The date printed on the issue.
    publish_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // The name on the cover; the admin defaults it to "MARCO".
    masthead: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    tagline: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    // For lists and SEO.
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("draft", "published"),
      allowNull: false,
      defaultValue: "draft",
    },
    // At most one issue at a time, and only a published one.
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Path of page 1's photo, for lists.
    cover_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    pages: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    // pages.length, set by the server.
    page_count: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    // +1 on every save. A save must send the version it started from, so two
    // people editing one issue can't overwrite each other.
    version: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
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
    tableName: "magazines",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    indexes: [
      // The site's list: published issues, newest first.
      {
        fields: ["status", "publish_date"],
        name: "magazines_status_publish_date",
      },
    ],
  }
);

// Soft delete saves with hooks off, so clear these here: the address becomes
// free for another issue, and a deleted issue can't stay featured.
Magazine.beforeDestroy(async (magazine) => {
  magazine.slug_active = null;
  magazine.is_featured = false;
});

module.exports = Magazine;
