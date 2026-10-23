const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class ContactUs extends Model {}
ContactUs.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    // name, subject and message come from the public contact form. They're
    // nullable because rows saved before the form was wired don't have them.
    name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mobile: {
      type: DataTypes.STRING(50),
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
    // NOTE: not snake_case like the other tables; renaming needs a migration.
    tableName: "contactus",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

ContactUs.beforeDestroy((contactUs) => {
  contactUs.is_active = false;
});

module.exports = ContactUs;
