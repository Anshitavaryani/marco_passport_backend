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
    // No longer unique:true — see slug_active below for why (same
    // soft-delete-vs-unique-constraint issue fixed on blog_categories).
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    // Carries the real unique constraint. Mirrors `slug` while the
    // listing is active, NULL once it's deleted, so a soft-deleted
    // listing's old slug doesn't block a new one from reusing it.
    slug_active: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    short_description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    about: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    // type='business' checklist ("Key highlights") — flat list of
    // strings. Distinct from what_to_expect below, which carries a
    // title+description pair per item rather than a single string.
    highlights: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // type='place' "What to expect" section — each entry is
    // { title, description }. Kept separate from `highlights` since
    // the shapes genuinely differ.
    what_to_expect: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // type='place' "Insider tips" — flat list of strings.
    insider_tips: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    featured_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
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
    // type='place' "Practical info".
    fees: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    parking: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // type='place' "Quick facts" — the one genuinely new value there.
    best_time_to_visit: {
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
  const existing = await this.findOne({ where: { slug_active: slug } });
  return !!existing;
};

Place.beforeSave(async (place) => {
  place.slug_active = place.is_active ? place.slug : null;
});

Place.beforeDestroy(async (place) => {
  place.is_active = false;
  place.slug_active = null;

  await place.save({ hooks: false });
});

module.exports = Place;