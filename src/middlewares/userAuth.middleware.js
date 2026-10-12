const httpStatus = require("http-status");
const jwt = require("jsonwebtoken");

const { User, UserToken, Profile } = require("../models");
const validateEmail = require("../helpers/validateEmail");
const validatePassword = require("../helpers/validatePassword");
const { tokenTypes, userStatusTypes } = require("../config/types");
const catchAsync = require("../utils/catchAsync");
const config = require("../config/config");
const responseWrapper = require("../config/responseWrapper");
const { validateResetPassordBody } = require("./common.middleware");

const SELF_REGISTERABLE_ROLE_IDS = [config.USR_ROLE_ID].filter(Boolean);

const validateRegisterUserBody = catchAsync(async (req, res, next) => {
  const { name, email, password, confirm_password } = req.body || {};
  const { role_id } = req.headers;

  if (!name || !email || !password || !confirm_password) {
    return responseWrapper(
      res,
      "",
      "Please Enter Required Fields : [ name || email || password || confirm_password ]",
      httpStatus.BAD_REQUEST
    );
  }

  if (!role_id || !SELF_REGISTERABLE_ROLE_IDS.includes(role_id)) {
    return responseWrapper(
      res,
      "",
      "Invalid role for self-registration.",
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

  const existing = await User.findOne({
    where: { email, role_id, is_active: true },
    attributes: ["id", "status"],
  });
  if (existing) {
    const message =
      existing.status === userStatusTypes.PENDING
        ? "This email is registered but not verified yet. Check your inbox or request a new verification email."
        : "Email already taken";
    return responseWrapper(res, "", message, httpStatus.BAD_REQUEST);
  }

  if (!validatePassword(password)) {
    return responseWrapper(
      res,
      "",
      "Password should have a minimum length of 8 characters and must have at least 2 digits and No Blank Space",
      httpStatus.BAD_REQUEST
    );
  }

  if (password !== confirm_password) {
    return responseWrapper(
      res,
      "",
      "Password and Confirm Password must be equal.",
      httpStatus.BAD_REQUEST
    );
  }

  next();
});

const validateSignInReqBody = catchAsync(async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return responseWrapper(
      res,
      "",
      "Please Enter Required Fields : [email, password]",
      httpStatus.BAD_REQUEST
    );
  }

  if (!req.body) req.body = {};
  req.body.ip_address = req.ip;

  next();
});

const verifyAuthJWTToken = catchAsync(async (req, res, next) => {
  const token = req.headers["x-access-token"];
  if (!token) {
    return responseWrapper(
      res,
      "",
      "Please authenticate",
      httpStatus.UNAUTHORIZED
    );
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch (jwtError) {
    const message =
      jwtError.name === "TokenExpiredError"
        ? "Token has expired. Please log in again."
        : "Invalid Token";
    return responseWrapper(res, "", message, httpStatus.UNAUTHORIZED);
  }

  const role_id = payload.role_id;

  const tokenDoc = await UserToken.findOne({
    where: {
      token: token,
      role_id: role_id,
      token_type: tokenTypes.ACCESS,
      user_id: payload.sub,
      is_active: true,
    },
  });

  if (!tokenDoc) {
    // Logged out, or revoked by a password reset.
    return responseWrapper(
      res,
      "",
      "Session expired. Please log in again.",
      httpStatus.UNAUTHORIZED
    );
  }

  const user = await User.findOne({
    where: { id: tokenDoc.user_id, is_active: 1, role_id: role_id },
    include: [
      {
        model: Profile,
        as: "user_profile",
        attributes: [
          "name",
          "dialing_code",
          "mobile",
          "is_active",
          "created_at",
        ],
      },
    ],
  });
  if (!user) {
    return responseWrapper(res, "", "User Not Found", httpStatus.NOT_FOUND);
  }

  if (!req.body) {
    req.body = {};
  }

  req.body.user = user;
  req.body.tokenDoc = tokenDoc;
  req.body.ip_address = req.ip;
  next();
});

// Optional auth for public routes: an invalid, expired or missing token
// never blocks the request; req.body.user is just left unset.
// req.body is created up front because GET requests have no parsed body.
const attachUserIfPresent = async (req, res, next) => {
  if (!req.body) req.body = {};

  const token = req.headers["x-access-token"];
  if (!token) return next();

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const role_id = payload.role_id;

    const tokenDoc = await UserToken.findOne({
      where: {
        token: token,
        role_id: role_id,
        token_type: tokenTypes.ACCESS,
        user_id: payload.sub,
        is_active: true,
      },
    });
    if (!tokenDoc) return next();

    const user = await User.findOne({
      where: { id: tokenDoc.user_id, is_active: 1, role_id: role_id },
    });
    if (user) {
      req.body.user = user;
    }
  } catch {
    // Expired/invalid token on an optional-auth route — proceed
    // anonymously rather than rejecting the request.
  }

  next();
};

const setRoleIdIfNotPresent = (req, res, next) => {
  if (!req.headers.role_id) {
    req.headers.role_id = config.USR_ROLE_ID;
  }
  next();
};

module.exports = {
  validateRegisterUserBody,
  verifyAuthJWTToken,
  attachUserIfPresent,
  validateResetPassordBody,
  setRoleIdIfNotPresent,
  validateSignInReqBody,
};