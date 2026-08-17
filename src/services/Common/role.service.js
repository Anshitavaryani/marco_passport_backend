const httpStatus = require("http-status");

const { Role } = require("../../models");
const ApiError = require("../../utils/ApiError");

const createRole = async (reqBody) => {
  const roleObj = {
    name: reqBody.name,
    abbreviation: reqBody.abbreviation,
  };
  const roleDoc = await Role.create(roleObj);
  if (!roleDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new Role"
    );
  }
  return !!roleDoc;
};

const updateRole = async (reqBody, id) => {
  const roleDoc = await Role.findByPk(id);
  if (!roleDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Role not found");
  }

  const providedFields = ["name", "abbreviation"].filter(
    (field) =>
      reqBody[field] &&
      typeof reqBody[field] !== "undefined" &&
      reqBody[field] !== ""
  );

  if (providedFields.length === 1) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Name and Abbreviation both needed."
    );
  }

  providedFields.forEach((field) => {
    roleDoc[field] = reqBody[field];
  });

  await roleDoc.save();
  return roleDoc;
};

// Confirmed: this takes a Role's own primary key directly — findByPk(id)
// — not a user id resolved via a join. This settles the open question
// from role.middleware.js: req.user.role_id (what's implemented there)
// is correct, not req.user.sub.
//
// NOTE: unlike User.isEmailTaken/isUserNameTaken elsewhere, this doesn't
// filter is_active. paranoid:true already excludes soft-deleted roles
// from findByPk automatically, so a deleted role is safely excluded
// either way — but if a role can ever be marked is_active:false WITHOUT
// being soft-deleted (nothing currently does this), this would still
// return it. Flagging in case that becomes a real code path later.
const findRoleById = async (id) => {
  const isRoleIdValid = await Role.findByPk(id);
  return isRoleIdValid;
};

const getAllRoles = async () => {
  const roleDoc = await Role.findAll({ where: { is_active: 1 } });
  return roleDoc;
};

const deleteRole = async (id) => {
  const roleDoc = await Role.findByPk(id);
  if (!roleDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Role not found");
  }
  await roleDoc.destroy();
};

module.exports = {
  findRoleById,
  createRole,
  getAllRoles,
  deleteRole,
  updateRole,
};
