const httpStatus = require("http-status");
const jwt = require("jsonwebtoken");

const { Admin, Department } = require("../models");
const validateEmail = require("../helpers/validateEmail");
const catchAsync = require("../utils/catchAsync");
const responseWrapper = require("../config/responseWrapper");
const { roleService } = require("../services");
const config = require("../config/config");
const { adminPanelRoles } = require("../config/types");
const { validateResetPassordBody } = require("./common.middleware");

// Only super admins reach this (see the route), and they may create other
// super admins.
const validateCreateAdminBody = catchAsync(async (req, res, next) => {
  const { role_id, department_id } = req.body;
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email =
    typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!name || !email || !role_id || !department_id) {
    return responseWrapper(
      res,
      "",
      "Please Enter Required Fields : [name || email_id ||  role_id || department_id]",
      httpStatus.BAD_REQUEST
    );
  }

  if (!validateEmail(email)) {
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

  const role = await roleService.findRoleById(parseInt(role_id, 10));
  if (!role) {
    return responseWrapper(res, "", "Invalid Role Id", httpStatus.BAD_REQUEST);
  }
  // e.g. USR, the public sign-up role, which can't use the panel.
  if (!adminPanelRoles.includes(role.abbreviation)) {
    return responseWrapper(
      res,
      "",
      "This role can't be given to an admin.",
      httpStatus.BAD_REQUEST
    );
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

  req.body.name = name;
  req.body.email = email;
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

  // GET requests have no parsed body, so make sure there's one to write to.
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