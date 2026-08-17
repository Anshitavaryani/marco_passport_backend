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

// Roles allowed to self-register through this public endpoint.
// Previously role_id was accepted from the request header with no
// restriction at all — a request could set role_id to any of config's
// admin-hierarchy role IDs (SUP_ADM_ROLE_ID, ADM_ROLE_ID, etc.) and get a
// User record created carrying that role_id, which is a straightforward
// privilege-escalation path anywhere downstream trusts the persisted
// role_id. Only USR is included here — still need confirmation on
// whether SP (Service Provider?) should also be self-registerable; add
// it to this list once that's confirmed.
const SELF_REGISTERABLE_ROLE_IDS = [config.USR_ROLE_ID].filter(Boolean);

const validateRegisterUserBody = catchAsync(async (req, res, next) => {
  const { name, email, mobile, password, confirm_password } = req.body;
  const { role_id } = req.headers;

  if (!name || !email || !mobile || !password || !confirm_password) {
    return responseWrapper(
      res,
      "",
      "Please Enter Required Fields : [ name || email || mobile || password || confirm_password ]",
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
  const { email, password } = req.body;

  if (!email || !password) {
    return responseWrapper(
      res,
      "",
      "Please Enter Required Fields : [email, password]",
      httpStatus.BAD_REQUEST
    );
  }
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
    // Previously any jwt.verify failure (including a plain expired
    // token — a completely normal, expected occurrence) bubbled up
    // through a generic catch that defaulted to a 500. An expired or
    // malformed token is a client-facing 401, not a server error.
    const message =
      jwtError.name === "TokenExpiredError"
        ? "Token has expired. Please log in again."
        : "Invalid Token";
    return responseWrapper(res, "", message, httpStatus.UNAUTHORIZED);
  }

  // Was reading role_id from req.headers['role_id'] here — a mutable
  // client header — even though a valid, already-signed token exists
  // with its own role_id claim embedded at issuance time. Deriving it
  // from the verified payload means this can no longer be spoofed by
  // whatever the client happens to send in a header on this request.
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

  req.body.user = user;
  req.body.tokenDoc = tokenDoc;
  req.body.ip_address = req.ip;
  next();
});

const validateForgetPassordToken = catchAsync(async (req, res, next) => {
  const { email, password, confirm_password, token } = req.body;
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

  // Added role_id to this filter — it was missing, so a verified OTP
  // token issued for one role_id's account (a person can hold more
  // than one account under the same email, scoped by role_id — see
  // isEmailTaken(email, role_id) above) could be replayed against a
  // *different* role_id's account for the same email, since only the
  // account lookup above was role-scoped, not this OTP/token check.
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
  validateResetPassordBody,
  setRoleIdIfNotPresent,
  validateForgetPassordToken,
  validateSignInReqBody,
};
