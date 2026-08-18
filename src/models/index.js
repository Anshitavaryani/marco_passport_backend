const Country = require("./country.model");
const State = require("./state.model");
const City = require("./city.model");
const Timezone = require("./timezone.model");
const Category = require("./category.model");

const Role = require("./role.model");
const Department = require("./department.model");

const Admin = require("./admin.model");
const User = require("./user.model");
const Profile = require("./profile.model");
const UserToken = require("./userToken.model");
const UserAttachment = require("./userAttachment.model");
const userLoginTiming = require("./user_login_timings.model");

const ContactUs = require("./contactUs.model");
const Faq = require("./faq.model");
const OTP = require("./otp.model");

const Payment = require("./payment.model");

module.exports = {
  Country,
  State,
  City,
  Timezone,
  Category,

  Role,
  Department,

  Admin,
  User,
  Profile,
  UserToken,
  UserAttachment,
  userLoginTiming,

  ContactUs,
  Faq,
  OTP,

  Payment,
};

function initTableRelation() {
  Country.hasMany(State, { foreignKey: "country_id", as: "all_state" });
  State.belongsTo(Country, { foreignKey: "country_id", as: "country" });

  Country.hasMany(City, { foreignKey: "country_id", as: "all_city" });
  City.belongsTo(Country, { foreignKey: "country_id", as: "country" });

  State.hasMany(City, { foreignKey: "state_id", as: "all_city" });
  City.belongsTo(State, { foreignKey: "state_id", as: "state" });

  Role.hasMany(Admin, { foreignKey: "role_id", as: "role_admins" });
  Admin.belongsTo(Role, { foreignKey: "role_id", as: "admin_role" });

  Department.hasMany(Admin, {
    foreignKey: "department_id",
    as: "department_admins",
  });
  Admin.belongsTo(Department, {
    foreignKey: "department_id",
    as: "admin_department",
  });

  User.hasOne(Profile, { foreignKey: "user_id", as: "user_profile" });
  Profile.belongsTo(User, { foreignKey: "user_id", as: "profile_user" });

  User.hasMany(UserAttachment, {
    foreignKey: "user_id",
    as: "user_attachments",
  });
  UserAttachment.belongsTo(User, {
    foreignKey: "user_id",
    as: "attachments_user",
  });

  User.hasMany(UserToken, { foreignKey: "user_id", as: "user_tokens" });
  UserToken.belongsTo(User, { foreignKey: "user_id", as: "token_user" });

  // FIXED: this used to be a second Role<->Admin pair (identical
  // foreignKey, identical two models, just different aliases —
  // 'role_users'/'user_role' — duplicating the Role<->Admin
  // association declared above for no reason). Those alias names read
  // like they were written for User, not Admin, and User.role_id had
  // no association defined anywhere despite the FK existing at the DB
  // level (see user.model.js). This was almost certainly a copy-paste
  // slip where Admin should have been User. Fixed to actually create
  // the missing User<->Role association, reusing the aliases that were
  // clearly intended for it.
  Role.hasMany(User, { foreignKey: "role_id", as: "role_users" });
  User.belongsTo(Role, { foreignKey: "role_id", as: "user_role" });

  // Not yet wired up as Sequelize associations, though the FK columns
  // exist at the DB level: OTP<->User, OTP<->Role, UserAttachment<->Role,
  // userLoginTiming<->Role/Token/Timezone, Payment<->User. None of these
  // are required unless something needs to eager-load via `include:` —
  // add them (with appropriate aliases) once a real consumer needs one,
  // rather than guessing alias names speculatively here.
}

initTableRelation();
