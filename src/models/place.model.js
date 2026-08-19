const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class Place extends Model {}
Place.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM,
      values: ["business", "place"],
      allowNull: false,
      defaultValue: "business",
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    tagline: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    short_description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    about: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    highlights: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // The single hero/cover image — used on card grids and as the
    // detail page's primary image.
    featured_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // Up to 10 image paths for the detail page's full gallery (includes
    // featured_image as its first entry). Stored as a JSON array rather
    // than a separate table since it's a simple bounded list with no
    // independent identity per image (no per-image caption/order beyond
    // upload order).
    gallery_images: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    hours: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    website_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    price_level: {
      type: DataTypes.ENUM,
      values: ["$", "$$", "$$$", "$$$$"],
      allowNull: true,
    },
    neighborhood: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    // CACHE ONLY — not settable via createPlace/updatePlace. Recomputed
    // by reviewService.recalculatePlaceRating() every time a review is
    // created, updated, or deleted (see review.service.js). Stored here
    // (denormalized) rather than computed via a join on every listing
    // read, since /explore and /places both sort and filter by rating
    // and that needs to stay fast across many listings at once.
    rating: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: true,
    },
    review_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_top_pick: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    top_pick_rank: {
      type: DataTypes.INTEGER,
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
    tableName: "places",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

Place.isSlugTaken = async function (slug) {
  const existing = await this.findOne({ where: { slug, is_active: true } });
  return !!existing;
};

Place.beforeDestroy(async (place) => {
  place.is_active = false;
});

module.exports = Place;