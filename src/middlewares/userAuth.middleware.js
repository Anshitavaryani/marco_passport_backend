const httpStatus = require("http-status");
const jwt = require("jsonwebtoken");

const { User, OTP, UserToken, Profile } = require("../models");
const validateEmail = require("../helpers/validateEmail");
const validatePassword = require("../helpers/validatePassword");
const { tokenTypes, otpTypes } = require("../config/types");
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

  if (await User.isEmailTaken(email, role_id)) {
    return responseWrapper(
      res,
      "",
      "Email already taken",
      httpStatus.BAD_REQUEST
    );
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
    return responseWrapper(res, "", "Token Not Found", httpStatus.BAD_REQUEST);
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

// Optional auth — for PUBLIC routes that want to personalize their
// response for a logged-in visitor without requiring login. Unlike
// verifyAuthJWTToken, this never blocks the request: no token, an
// expired token, or an invalid token all just fall through with
// req.body.user left unset, and the route behaves exactly as it would
// for a fully anonymous visitor.
//
// req.body is guarded RIGHT HERE, before the no-token early return —
// not just in the success path further down. A GET request with no
// token never gets any body-parsing middleware to run at all, so
// req.body is genuinely undefined at this point; downstream
// controllers reading req.body.user?.id would crash on req.body
// itself (not just .user) if this function returned early without
// first making sure req.body is at least an empty object.
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
  } catch (jwtError) {
    // Expired/invalid token on an optional-auth route — proceed
    // anonymously rather than rejecting the request.
  }

  next();
};

const validateForgetPassordToken = catchAsync(async (req, res, next) => {
  const { email, password, confirm_password, token } = req.body || {};
  const { role_id } = req.headers;

  if (!email || !password || !confirm_password || !token) {
    return responseWrapper(
      res,
      "",
      "Please Enter Required Fields : [ email || new_password || confirm_password || token ]",
      httpStatus.BAD_REQUEST
    );
  }

  const userDoc = await User.findOne({
    where: { email: email, is_active: true, role_id: role_id },
  });
  if (!userDoc) {
    return responseWrapper(
      res,
      "",
      "User With This Email Id Not Found.",
      httpStatus.BAD_REQUEST
    );
  }

  const otpDoc = await OTP.findOne({
    where: {
      email: email,
      code: token,
      is_verified: true,
      type: otpTypes.FORGOT_PASSWORD,
      role_id: role_id,
    },
  });
  if (!otpDoc) {
    return responseWrapper(
      res,
      "",
      "Forget Password Token is not Valid.",
      httpStatus.BAD_REQUEST
    );
  }

  req.body.user = userDoc;
  req.body.otpDoc = otpDoc;
  next();
});

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
  validateForgetPassordToken,
  validateSignInReqBody,
};