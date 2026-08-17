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
    // NOTE: otp / is_otp_valid / remember_token don't appear to be
    // referenced anywhere in adminAuth.middleware.js or the parts of
    // adminAuth.service.js reviewed so far — the admin-side auth flow
    // uses JWT + this same Admin table, with no separate token table.
    // These look like leftovers from an earlier OTP-based admin auth
    // design that was superseded. Flagging rather than removing, since I
    // haven't seen every consumer of the Admin model yet.
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
  }
);

Admin.afterCreate(async (admin) => {
  const socketId = `${admin.role_id}-${admin.id}-${admin.department_id}-socketId`;
  admin.socket_id = socketId;
  await admin.save();
});

// NOTE: scoped only by email, unlike User.isEmailTaken(email, role_id).
// Means admin email uniqueness is global across the whole admin
// hierarchy (SUP_ADM/ADM/SUB_ADM/ENG/EDTR all share one namespace), vs.
// User's per-role scoping. Plausibly intentional (internal staff vs.
// external customers), flagging so it's a deliberate choice rather than
// an inherited inconsistency.
Admin.isEmailTaken = async function (email) {
  let u = await this.findOne({ where: { email: email, is_active: true } });
  return !!u;
};

// Removed: a beforeUpdate hook that manually set updated_at to a
// hand-formatted string. Redundant three times over — Sequelize's own
// timestamps:true + updatedAt:'updated_at' already does this with a real
// Date, and the column itself has onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
// telling MySQL to do it at the DB level regardless. This pattern was
// identical across every model in this codebase; removed everywhere.

Admin.beforeDestroy(async (admin) => {
  // deleted_at itself is handled automatically by paranoid:true — no
  // need to set it manually here (that line was removed). is_active
  // is NOT managed by paranoid mode though, so this is worth keeping.
  admin.is_active = false;
});

module.exports = Admin;
