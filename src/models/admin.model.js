const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class Admin extends Model {}
Admin.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // NOTE: app-level validation always requires this on creation (see validateCreateAdminBody) — consider tightening to allowNull:false once confirmed no existing rows have NULL role_id
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
      references: {
        model: "roles",
        key: "id",
      },
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
      references: {
        model: "departments",
        key: "id",
      },
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    socket_id: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    remember_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // otp / is_otp_valid / remember_token back the admin forgot-password flow.
    otp: {
      type: DataTypes.STRING,
      allowNull: true,
      set(value) {
        if (!value) {
          this.setDataValue("is_otp_valid", false);
        } else {
          this.setDataValue("is_otp_valid", true);
        }
        this.setDataValue("otp", value);
      },
    },
    is_otp_valid: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    // email while the row is live, NULL once soft-deleted; unique-indexed.
    email_active_key: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "admins",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    indexes: [
      {
        unique: true,
        fields: ["email_active_key"],
        name: "admins_email_active_unique",
      },
    ],
  }
);

// Admin emails are unique across all admin roles (users are per-role).
Admin.isEmailTaken = async function (email) {
  let u = await this.findOne({ where: { email: email, is_active: true } });
  return !!u;
};

Admin.beforeDestroy(async (admin) => {
  // paranoid:true handles deleted_at; is_active has to be kept in sync here.
  // Soft delete saves with hooks off, so beforeSave won't clear the key.
  admin.is_active = false;
  admin.email_active_key = null;
});

Admin.beforeSave(async (admin) => {
  admin.email_active_key = admin.deleted_at ? null : admin.email;
});

module.exports = Admin;
