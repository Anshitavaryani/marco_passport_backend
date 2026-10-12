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

// Takes the role's own primary key; paranoid:true excludes deleted roles.
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
