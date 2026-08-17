const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");
const { roleService } = require("../services");
const { rolesTypes } = require("../config/types");
const responseWrapper = require("../config/responseWrapper");

// NOTE on req.user.role_id: previously this read req.user.id, which
// doesn't exist on the JWT payload at all — token.service.js signs
// tokens with { sub, iat, exp, type, role_id }; there is no `id` field.
// Every check below was calling roleService.findRoleById(undefined).
//
// Changed to req.user.role_id, since that field IS present on the
// payload and matches this function's own name far better ("findRoleById"
// reads as "find a Role by its own id", not "resolve a user's role via a
// join on their user id"). I can't fully confirm this without seeing
// services/Common/role.service.js's actual implementation — please send
// that next so I can verify this end-to-end. If findRoleById actually
// expects a user id and does an internal join, this needs to be
// req.user.sub instead.
const isSuperAdmin = catchAsync(async (req, res, next) => {
  const roleDoc = await roleService.findRoleById(req.user.role_id);
  if (!roleDoc || roleDoc.name !== rolesTypes.SUP_ADM) {
    return responseWrapper(
      res,
      "",
      "You are not authorized to access this api",
      httpStatus.UNAUTHORIZED
    );
  }
  next();
});

const isSubAdmin = catchAsync(async (req, res, next) => {
  const roleDoc = await roleService.findRoleById(req.user.role_id);
  if (
    roleDoc &&
    (roleDoc.name === rolesTypes.SUP_ADM || roleDoc.name === rolesTypes.ADM)
  ) {
    return next();
  }
  return responseWrapper(
    res,
    "",
    "You are not authorized to access this api",
    httpStatus.UNAUTHORIZED
  );
});

const isAdmin = catchAsync(async (req, res, next) => {
  const roleDoc = await roleService.findRoleById(req.user.role_id);
  if (
    roleDoc &&
    (roleDoc.name === rolesTypes.SUP_ADM ||
      roleDoc.name === rolesTypes.ADM ||
      roleDoc.name === rolesTypes.SUB_ADM)
  ) {
    return next();
  }
  return responseWrapper(
    res,
    "",
    "You are not authorized to access this api",
    httpStatus.UNAUTHORIZED
  );
});

const isEngineer = catchAsync(async (req, res, next) => {
  const roleDoc = await roleService.findRoleById(req.user.role_id);
  // Was inverted: this used to return UNAUTHORIZED for exactly the
  // roles that should be let through (SUP_ADM/ADM/SUB_ADM/ENG), and
  // call next() for everyone else — i.e. it blocked legitimate
  // engineers and let anyone else in.
  if (
    roleDoc &&
    (roleDoc.name === rolesTypes.SUP_ADM ||
      roleDoc.name === rolesTypes.ADM ||
      roleDoc.name === rolesTypes.SUB_ADM ||
      roleDoc.name === rolesTypes.ENG)
  ) {
    return next();
  }
  return responseWrapper(
    res,
    "",
    "You are not authorized to access this api",
    httpStatus.UNAUTHORIZED
  );
});

const isEditor = catchAsync(async (req, res, next) => {
  const roleDoc = await roleService.findRoleById(req.user.role_id);
  if (
    roleDoc &&
    (roleDoc.name === rolesTypes.SUP_ADM ||
      roleDoc.name === rolesTypes.ADM ||
      roleDoc.name === rolesTypes.SUB_ADM ||
      roleDoc.name === rolesTypes.ENG ||
      roleDoc.name === rolesTypes.EDTR)
  ) {
    return next();
  }
  return responseWrapper(
    res,
    "",
    "You are not authorized to access this api",
    httpStatus.UNAUTHORIZED
  );
});

module.exports = {
  isSuperAdmin,
  isSubAdmin,
  isAdmin,
  isEngineer,
  isEditor,
};
