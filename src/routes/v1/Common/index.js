const contactUsRoute = require("./contactUs.route");
const faqRoute = require("./faq.route");
const roleRoute = require("./role.route");
const departmentRoute = require("./department.route");
const countryRoute = require("./country.route");
const stateRoute = require("./state.route");
const cityRoute = require("./city.route");
const paymentRoute = require("./payment.route");
const blogRoute = require("./blog.route");
const blogCategoryRoute = require("./blogCategory.route");
const placeCategoryRoute = require("./placeCategory.route");
const exploreRoute = require("./explore.route");
const businessSubmissionRoute = require("./businessSubmission.route");
const passportRoute = require('./passport.route')

const commonRoutes = [
  {
    path: "/contactUs",
    route: contactUsRoute,
  },
  {
    path: "/faq",
    route: faqRoute,
  },
  {
    path: "/role",
    route: roleRoute,
  },
  {
    path: "/department",
    route: departmentRoute,
  },
  {
    path: "/country",
    route: countryRoute,
  },
  {
    path: "/state",
    route: stateRoute,
  },
  {
    path: "/city",
    route: cityRoute,
  },
  {
    path: "/payment",
    route: paymentRoute,
  },
  {
    path: "/blog",
    route: blogRoute,
  },
  {
    path: "/blog-category",
    route: blogCategoryRoute,
  },
  {
    path: "/place-category",
    route: placeCategoryRoute,
  },
  {
    path: "/explore",
    route: exploreRoute,
  },
  {
    path: "/business-submission",
    route: businessSubmissionRoute,
  },
  {
    path: "/user/passport/",
    route: passportRoute,
  },
];

module.exports = commonRoutes;
