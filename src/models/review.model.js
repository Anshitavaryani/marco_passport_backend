const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class Review extends Model {}
Review.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    place_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      references: {
        model: "places",
        key: "id",
      },
    },
    // Reviews come from logged-in Passport users, not admins — this
    // references users.id, matching the "Add to Passport requires
    // login" flow already established for this feature.
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      references: {
        model: "users",
        key: "id",
      },
    },
    rating: {
      type: DataTypes.TINYINT,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    comment: {
      type: DataTypes.TEXT,
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
    tableName: "reviews",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    indexes: [
      {
        unique: true,
        fields: ["place_id", "user_id"],
        name: "reviews_place_user_unique",
      },
    ],
  }
);

Review.beforeDestroy(async (review) => {
  review.is_active = false;
});

module.exports = Review;