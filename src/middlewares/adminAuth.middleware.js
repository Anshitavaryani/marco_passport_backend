const httpStatus = require("http-status");
const jwt = require("jsonwebtoken");

const { Admin, Department } = require("../models");
const validateEmail = require("../helpers/validateEmail");
const catchAsync = require("../utils/catchAsync");
const responseWrapper = require("../config/responseWrapper");
const { roleService } = require("../services");
const config = require("../config/config");
const { validateResetPassordBody } = require("./common.middleware");

const validateCreateAdminBody = catchAsync(async (req, res, next) => {
  const { name, email, password, role_id, department_id } = req.body;
  if (!name || !email || !password || !role_id || !department_id) {
    return responseWrapper(
      res,
      "",
      "Please Enter Required Fields : [name || email_id || password || role_id || department_id]",
      httpStatus.BAD_REQUEST
    );
  }

  if (role_id === config.SUP_ADM_ROLE_ID) {
    return responseWrapper(
      res,
      "",
      "You are not authorized to create this role.",
      httpStatus.BAD_REQUEST
    );
  }

  if (!validateEmail(email) || name.length === 0) {
    return responseWrapper(
      res,
      "",
      "Invalid Name or Email",
      httpStatus.BAD_REQUEST
    );
  }

  if (await Admin.isEmailTaken(email)) {
    return responseWrapper(
      res,
      "",
      "Email already taken",
      httpStatus.BAD_REQUEST
    );
  }

  const isValidRoleId = await roleService.findRoleById(parseInt(role_id, 10));
  if (!isValidRoleId) {
    return responseWrapper(res, "", "Invalid Role Id", httpStatus.BAD_REQUEST);
  }

  const isValidDepartmentId = await Department.findByPk(
    parseInt(department_id, 10)
  );
  if (!isValidDepartmentId) {
    return responseWrapper(
      res,
      "",
      "Invalid Department Id",
      httpStatus.BAD_REQUEST
    );
  }

  next();
});

const validateLoginAdminBody = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return responseWrapper(
      res,
      "",
      "Please Enter Required Fields : [ email_id || password ]",
      httpStatus.BAD_REQUEST
    );
  }

  if (!validateEmail(email)) {
    return responseWrapper(res, "", "Invalid Email", httpStatus.BAD_REQUEST);
  }

  next();
});

const validateJWTtoken = catchAsync(async (req, res, next) => {
  const token = req.header("x-access-token");
  if (!token) {
    return responseWrapper(
      res,
      "",
      "Access denied: No token provided",
      httpStatus.BAD_REQUEST
    );
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret, { algorithms: ["HS256"] });
  } catch (jwtError) {
    const message =
      jwtError.name === "TokenExpiredError"
        ? "Token has expired. Please log in again."
        : "Invalid token.";
    return responseWrapper(res, "", message, httpStatus.UNAUTHORIZED);
  }

  const admin = await Admin.findOne({
    where: { id: payload.sub, is_active: true },
  });
  if (!admin) {
    return responseWrapper(
      res,
      "",
      "Account no longer exists or is inactive.",
      httpStatus.UNAUTHORIZED
    );
  }

  // req.body is only ever populated by a prior body-parsing middleware
  // (express.json(), multer, etc.) that actually matched the request's
  // Content-Type. A GET request typically sends no body at all, so
  // nothing runs and req.body stays undefined — writing `.user` onto
  // that threw "Cannot set properties of undefined" the moment any GET
  // route was placed behind this middleware (e.g. GET /explore/admin).
  // This guard makes sure there's always an object here to write onto,
  // regardless of the request method or whether a body was sent.
  if (!req.body) {
    req.body = {};
  }

  req.user = payload;
  req.body.user = admin;
  next();
});

module.exports = {
  validateCreateAdminBody,
  validateLoginAdminBody,
  validateJWTtoken,
  validateResetPassordBody,
};