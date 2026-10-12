const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");
const { roleService } = require("../services");
const { rolesTypes } = require("../config/types");
const responseWrapper = require("../config/responseWrapper");

// req.user is the JWT payload; role_id is the admin's role primary key.
// Roles are matched on roles.abbreviation (SUP_ADM, ADM, ...), not on the
// display name.
const allowRoles = (allowed) =>
  catchAsync(async (req, res, next) => {
    const roleDoc = await roleService.findRoleById(req.user.role_id);
    if (roleDoc && allowed.includes(roleDoc.abbreviation)) {
      return next();
    }
    return responseWrapper(
      res,
      "",
      "You are not authorized to access this api",
      httpStatus.UNAUTHORIZED
    );
  });

const isSuperAdmin = allowRoles([rolesTypes.SUP_ADM]);

const isAdmin = allowRoles([
  rolesTypes.SUP_ADM,
  rolesTypes.ADM,
  rolesTypes.SUB_ADM,
]);

const isEditor = allowRoles([
  rolesTypes.SUP_ADM,
  rolesTypes.ADM,
  rolesTypes.SUB_ADM,
  rolesTypes.ENG,
  rolesTypes.EDTR,
]);

module.exports = {
  isSuperAdmin,
  isAdmin,
  isEditor,
};
