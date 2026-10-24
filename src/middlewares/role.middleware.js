const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");
const { roleService } = require("../services");
const { rolesTypes } = require("../config/types");
const responseWrapper = require("../config/responseWrapper");

// Runs after validateJWTtoken. The role comes from the admin's row it
// loaded (req.body.user), not the token (req.user), so a role change takes
// effect at once instead of when the 5-day token expires.
// Roles are matched on roles.abbreviation (SUP_ADM, ADM, ...), not on the
// display name.
const allowRoles = (allowed) =>
  catchAsync(async (req, res, next) => {
    const roleId = req.body?.user?.role_id ?? req.user.role_id;
    const roleDoc = await roleService.findRoleById(roleId);
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
