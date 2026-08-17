const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");
const { v4: uuidv4 } = require("uuid");
const {
  paymentStatusTypes,
  paymentModeTypes,
  currencyTypes,
} = require("../config/types");
const config = require("../config/config");

class Payment extends Model {}
Payment.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    currency: {
      type: DataTypes.ENUM,
      values: [
        currencyTypes.CHF,
        currencyTypes.EUR,
        currencyTypes.INR,
        currencyTypes.KYD,
        currencyTypes.OMR,
        currencyTypes.USD,
      ],
      defaultValue: currencyTypes.USD,
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
      references: {
        model: "users",
        key: "id",
      },
    },
    amount: {
      // NOTE: plain INTEGER, not DECIMAL — that's actually correct
      // here rather than a currency-precision bug, *provided*
      // amounts are stored in Stripe's minor-unit convention (e.g.
      // cents for USD), matching stripe_customer_id/STRIPE_SECRET_KEY
      // usage elsewhere. Worth confirming that convention is applied
      // consistently everywhere this column is written.
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: config.DEFAULT_AMOUNT,
    },
    stripe_customer_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Description Not Available.",
    },
    payment_status: {
      type: DataTypes.ENUM(
        paymentStatusTypes.PENDING,
        paymentStatusTypes.SUCCESS,
        paymentStatusTypes.REJECTED
      ),
      allowNull: false,
      defaultValue: paymentStatusTypes.PENDING,
    },
    payment_mode: {
      type: DataTypes.ENUM(
        paymentModeTypes.BANK_ACCOUNT,
        paymentModeTypes.DEBIT_CARD,
        paymentModeTypes.CREDIT_CARD,
        paymentModeTypes.GOOGLE_PAY,
        paymentModeTypes.PHONE_PAY,
        paymentModeTypes.UNKNOWN,
        paymentModeTypes.CARD
      ),
      allowNull: false,
      defaultValue: paymentModeTypes.CARD,
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
    tableName: "payments",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

// Removed: redundant beforeUpdate hook — see admin.model.js for why.
// It also shadowed the outer `Payment` class with its own parameter
// (`(Payment) => {...}`), fixed below by lowercasing.

Payment.beforeDestroy((payment) => {
  payment.is_active = false;
});

module.exports = Payment;
