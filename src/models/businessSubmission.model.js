const { Sequelize, DataTypes, Model } = require("sequelize");

const sequelize = require("../config/central.db");

class BusinessSubmission extends Model {}

BusinessSubmission.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    business_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    contact_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    phone: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    plan: {
      type: DataTypes.ENUM,
      values: ["full_page", "half_page", "business_card"],
      allowNull: false,
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    additional_details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM,
      values: ["pending", "approved", "rejected"],
      allowNull: false,
      defaultValue: "pending",
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
    tableName: "business_submissions",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

module.exports = BusinessSubmission;