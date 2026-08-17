const httpStatus = require("http-status");

const { Department } = require("../../models");
const ApiError = require("../../utils/ApiError");

const createDepartment = async (reqBody) => {
  const departmentObj = {
    name: reqBody.name,
  };
  const departmentDoc = await Department.create(departmentObj);
  if (!departmentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new Department"
    );
  }
  return departmentDoc;
};

const updateDepartment = async (reqBody, id) => {
  const departmentDoc = await Department.findByPk(id);
  if (!departmentDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Department not found");
  }
  if (
    reqBody.name &&
    typeof reqBody.name !== "undefined" &&
    reqBody.name !== ""
  ) {
    departmentDoc["name"] = reqBody.name;
  }

  await departmentDoc.save();
  return departmentDoc;
};

const getAllDeparments = async () => {
  const departmentDoc = await Department.findAll({ where: { is_active: 1 } });
  return departmentDoc;
};

// NOTE: returns [] (truthy!) rather than null when not found, unlike
// every other findById-style function in this codebase. A caller doing
// `if (!result)` to check for "not found" would never catch this case.
// Not changing without seeing where this is actually called from — flag
// if you'd like this switched to returning null/departmentDoc instead.
const findDepartmentById = async (id) => {
  const departmentDoc = await Department.findByPk(id);
  return departmentDoc ? departmentDoc : [];
};

const deleteDepartment = async (id) => {
  const departmentDoc = await Department.findByPk(Number(id));
  if (!departmentDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Department not found");
  }
  return await departmentDoc.destroy();
};

module.exports = {
  getAllDeparments,
  createDepartment,
  updateDepartment,
  findDepartmentById,
  deleteDepartment,
};
