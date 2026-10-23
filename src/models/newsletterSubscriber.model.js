const { Sequelize, DataTypes, Model } = require("sequelize");

const sequelize = require("../config/central.db");

// Emails from the site's newsletter forms. Nothing sends to them yet; they're
// kept for when a mailing service is connected.
class NewsletterSubscriber extends Model {}

NewsletterSubscriber.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: "newsletter_subscribers_email_unique",
    },

    // Which form they used, e.g. "footer" or "blog".
    source: {
      type: DataTypes.STRING(50),
      allowNull: true,
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
  },
  {
    sequelize,
    tableName: "newsletter_subscribers",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = NewsletterSubscriber;
