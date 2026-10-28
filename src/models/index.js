const Country = require("./country.model");
const State = require("./state.model");
const City = require("./city.model");
const Timezone = require("./timezone.model");

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
const NewsletterSubscriber = require("./newsletterSubscriber.model");

const BlogCategory = require("./blogCategory.model");
const Blog = require("./blog.model");
const Magazine = require("./magazine.model");
const Place = require("./place.model");
const PlaceCategory = require("./placeCategory.model");
const PlaceCategoryMap = require("./placeCategoryMap.model");
const Review = require("./review.model");

const BusinessSubmission = require("./businessSubmission.model");
const Passport = require("./passport.model");
const PassportItem = require("./passportItem.model");

module.exports = {
  Country,
  State,
  City,
  Timezone,

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
  NewsletterSubscriber,

  BlogCategory,
  Blog,
  Magazine,

  Place,
  PlaceCategory,
  PlaceCategoryMap,
  Review,

  BusinessSubmission,
  Passport,
  PassportItem,
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

  Role.hasMany(User, { foreignKey: "role_id", as: "role_users" });
  User.belongsTo(Role, { foreignKey: "role_id", as: "user_role" });

  // FK columns without associations (add one when something needs to
  // eager-load it): UserAttachment<->Role, userLoginTiming<->Role/Token/Timezone.

  BlogCategory.hasMany(Blog, {
    foreignKey: "category_id",
    as: "category_blogs",
  });
  Blog.belongsTo(BlogCategory, {
    foreignKey: "category_id",
    as: "blog_category",
  });

  Place.belongsToMany(PlaceCategory, {
    through: PlaceCategoryMap,
    foreignKey: "place_id",
    otherKey: "category_id",
    as: "categories",
  });
  PlaceCategory.belongsToMany(Place, {
    through: PlaceCategoryMap,
    foreignKey: "category_id",
    otherKey: "place_id",
    as: "places",
  });

  Place.hasMany(Review, { foreignKey: "place_id", as: "place_reviews" });
  Review.belongsTo(Place, { foreignKey: "place_id", as: "review_place" });

  User.hasMany(Review, { foreignKey: "user_id", as: "user_reviews" });
  Review.belongsTo(User, { foreignKey: "user_id", as: "reviewer" });

  // The alias stays "itineraries": it's the key the admin user-detail
  // response (GET /admin/user/:id) returns passports under.
  User.hasMany(Passport, { foreignKey: "user_id", as: "itineraries" });
  Passport.belongsTo(User, { foreignKey: "user_id", as: "owner" });

  // foreignKey must be the attribute (passport_id), not its column
  // (itinerary_id): a column name here would add a second attribute.
  Passport.hasMany(PassportItem, { foreignKey: "passport_id", as: "items" });
  PassportItem.belongsTo(Passport, {
    foreignKey: "passport_id",
    as: "passport",
  });

  Place.hasMany(PassportItem, { foreignKey: "place_id", as: "passport_items" });
  PassportItem.belongsTo(Place, { foreignKey: "place_id", as: "place" });
}

initTableRelation();
