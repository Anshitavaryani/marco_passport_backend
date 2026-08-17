// NOTE: filename ("departmenat") and this file's require sites elsewhere
// (models/index.js does `require('./departmenat.model')`) both carry the
// same typo. Not renaming the file in this pass — that requires updating
// every require() site in one coordinated change, not just this file.
// Flagging so it's a deliberate fix later, not forgotten.
const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class Department extends Model {}
Department.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
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
    tableName: "departments",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

// Removed: redundant beforeUpdate hook — see admin.model.js for why.

Department.beforeDestroy(async (department) => {
  department.is_active = false;
});

module.exports = Department;
