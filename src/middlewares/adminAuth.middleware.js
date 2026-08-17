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
    // Previously: jwt.verify(token, Buffer.from(config.jwt.secret, 'hex'), { algorithm: 'HS256' })
    // Two bugs there: (1) the secret is never hex-encoded at sign
    // time — token.service.js signs with the plain secret string —
    // so checking the signature against Buffer.from(secret, 'hex')
    // checked it against entirely the wrong bytes. Every admin token
    // verification failed. (2) `algorithm` (singular) isn't a real
    // jwt.verify() option; it's `algorithms` (plural, array). The
    // singular key was silently ignored, so the intended
    // algorithm allow-list was never actually enforced.
    payload = jwt.verify(token, config.jwt.secret, { algorithms: ["HS256"] });
  } catch (jwtError) {
    const message =
      jwtError.name === "TokenExpiredError"
        ? "Token has expired. Please log in again."
        : "Invalid token.";
    return responseWrapper(res, "", message, httpStatus.UNAUTHORIZED);
  }

  // Confirms the admin account still exists AND is still active — a
  // JWT stays valid by signature alone until it expires, regardless of
  // what happens to the account it names in the meantime (deactivated,
  // deleted, etc). Filtering on is_active means a deactivated admin's
  // still-valid JWT stops working immediately rather than at whatever
  // point it happens to expire on its own.
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

  // NOTE (architectural gap, not fixable in this file alone): there's
  // no AdminToken table analogous to UserToken, so there's currently no
  // way to revoke a specific admin session before its JWT naturally
  // expires — a fired employee's token, or a just-changed password,
  // both stay valid until `exp`. The old `is_backlisted` check that
  // used to be here never actually worked (nothing ever set that field
  // on the JWT payload), so removing it doesn't lose real
  // functionality — it just stops pretending there was a revocation
  // mechanism where there wasn't one. Worth a real fix (an AdminToken
  // table mirroring UserToken) if revocation matters — happy to design
  // that when we get to the models layer.
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
