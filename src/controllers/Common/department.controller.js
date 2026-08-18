const httpStatus = require("http-status");

const catchAsync = require("../../utils/catchAsync");
const ApiError = require("../../utils/ApiError");
// Was require('../../services/Common') — other controllers (city,
// country, state, contactUs) use the flattened top-level
// require('../../services') instead. Both resolve to the exact same
// object (services/index.js spreads Common's exports up to the top
// level), so this is a pure style normalization, not a behavior change.
const { departmentService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

const getAllDeparments = catchAsync(async (req, res) => {
  const departments = await departmentService.getAllDeparments();
  return responseWrapper(res, departments, "");
});

const createDepartment = catchAsync(async (req, res) => {
  const department = await departmentService.createDepartment(req.body);
  return responseWrapper(
    res,
    department,
    "New department Created Successfully",
    httpStatus.CREATED
  );
});

const updateDepartment = catchAsync(async (req, res) => {
  const departmentDoc = await departmentService.updateDepartment(
    req.body,
    req.params.id
  );
  return responseWrapper(res, departmentDoc, "Department Update Successfully");
});

const findDepartmentById = catchAsync(async (req, res) => {
  const departmentDoc = await departmentService.findDepartmentById(
    req.params.id
  );
  // Was missing entirely — a nonexistent id previously came back as
  // {success:true, status:200, data:[]} (the service's not-found
  // sentinel is a truthy empty array, flagged a few turns back).
  // Adding the check here rather than changing the service's return
  // shape, since I still don't know every other caller of that
  // service function.
  if (
    !departmentDoc ||
    (Array.isArray(departmentDoc) && departmentDoc.length === 0)
  ) {
    throw new ApiError(httpStatus.NOT_FOUND, "Department not found.");
  }
  return responseWrapper(res, departmentDoc, "");
});

const deleteDepartment = catchAsync(async (req, res) => {
  await departmentService.deleteDepartment(req.params.id);
  return responseWrapper(res, "", "Deleted Successfully.", httpStatus.OK);
});

module.exports = {
  getAllDeparments,
  createDepartment,
  updateDepartment,
  findDepartmentById,
  deleteDepartment,
};
