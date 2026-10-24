const bcrypt = require("bcrypt");
const crypto = require("crypto");
const httpStatus = require("http-status");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

const { Admin, Role, Department } = require("../../models");
const ApiError = require("../../utils/ApiError");
const config = require("../../config/config");
const logger = require("../../config/logger");
const validateEmail = require("../../helpers/validateEmail");
const { emailService } = require("../Common");
const { otpTypes, rolesTypes, adminPanelRoles } = require("../../config/types");
const generateOTP = require("../../utils/generateOTP");
const { sendAdminCredentials } = require("../Common/email.service");

const OTP_VALIDITY_MS = 5 * 60 * 1000;

// What the admin screens get about an account: never the password hash,
// OTP or reset token.
const ADMIN_ATTRIBUTES = [
  "id",
  "name",
  "email",
  "role_id",
  "department_id",
  "is_active",
  "created_at",
  "updated_at",
];
const ADMIN_INCLUDE = [
  { model: Role, as: "admin_role", attributes: ["id", "name", "abbreviation"] },
  { model: Department, as: "admin_department", attributes: ["id", "name"] },
];

const LAST_SUPER_ADMIN = "There must be at least one Super Admin.";

const badRequest = (message) => new ApiError(httpStatus.BAD_REQUEST, message);

const isBlank = (value) =>
  value === undefined || value === null || String(value).trim() === "";

// Live super admins other than this one, so admin management is never left
// without anyone who can do it.
const countOtherSuperAdmins = (excludeId) =>
  Admin.count({
    where: { is_active: true, id: { [Op.ne]: excludeId } },
    include: [
      {
        model: Role,
        as: "admin_role",
        where: { abbreviation: rolesTypes.SUP_ADM },
        attributes: [],
      },
    ],
  });

const findAdminById = async (id) => {
  const adminDoc = await Admin.findOne({
    where: { id: id, is_active: true },
    attributes: ADMIN_ATTRIBUTES,
    include: ADMIN_INCLUDE,
  });
  if (!adminDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found.");
  }
  return adminDoc;
};

// Creates the account with a temporary password and emails it. Without that
// email nobody knows the password, so a failed send removes the account
// again and the super admin can simply retry.
const createAdminUser = async (userBody) => {
  const password = crypto.randomBytes(9).toString("base64url");
  const salt = bcrypt.genSaltSync(10);
  const admin = await Admin.create({
    name: userBody.name,
    email: userBody.email,
    password: bcrypt.hashSync(password, salt),
    role_id: userBody.role_id,
    department_id: userBody.department_id,
  });

  try {
    await sendAdminCredentials(userBody.email, password);
  } catch (error) {
    logger.error(`Invitation email to admin ${admin.id} failed: ${error.message}`);
    await admin.destroy({ force: true });
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Couldn't send the invitation email, so the admin wasn't created. Check the email settings and try again.",
    );
  }

  return findAdminById(admin.id);
};

const signAdminToken = (user, expiresIn) => {
  return jwt.sign(
    { sub: user.id, role_id: user.role_id, department_id: user.department_id },
    config.jwt.secret,
    { algorithm: "HS256", expiresIn }
  );
};

const loginAdminUser = async (reqBody) => {
  const user = await Admin.findOne({
    where: { email: reqBody.email, is_active: true },
  });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Error: User not found.");
  }

  const validPass = await bcrypt.compare(reqBody.password, user.password);
  if (!validPass) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Error: Invalid email or password. Please try again."
    );
  }

  const token = signAdminToken(user, "5d");
  return {
    name: user.name,
    email: user.email,
    token: token,
  };
};

const resetAdminPassword = async (reqBody) => {
  const { old_password, confirm_password, user } = reqBody;

  const userDoc = await Admin.findByPk(user.id);
  if (!userDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User Not Found.");
  }

  const validPass = await bcrypt.compare(old_password, userDoc?.password);
  if (!validPass) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Incorrect Old Password.");
  }

  const salt = bcrypt.genSaltSync(10);
  userDoc.password = bcrypt.hashSync(confirm_password, salt);
  await userDoc.save();

  return "Password Changed Successfully.";
};

const sendOTP = async (email) => {
  const user = await Admin.findOne({
    where: { email: email, is_active: true },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid Email");
  }

  const generatedOTP = generateOTP(6);
  await emailService.sendForgotPasswordOTP(email, generatedOTP);
  await Admin.update(
    { otp: generatedOTP, is_otp_valid: true },
    { where: { email: user.email } }
  );
  return true;
};

const verifyOTP = async (email, otp, otp_type) => {
  if (!email || !otp) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please Enter Required Fields : [email, otp]"
    );
  }

  const user = await Admin.findOne({ where: { email: email } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid Email");
  }

  if (otp !== user.otp || user.is_otp_valid === false) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid OTP Entered");
  }

  const otpAgeMs = Date.now() - new Date(user.updated_at).getTime();
  if (otpAgeMs > OTP_VALIDITY_MS) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "OTP has expired. Please request a new one."
    );
  }

  let token = "";
  if (otp_type === otpTypes.FORGOT_PASSWORD) {
    token = signAdminToken(user, "1d");
    user.remember_token = token;
  }
  user.is_otp_valid = false;
  await user.save();
  return token ? { token } : "";
};

const forgotAdminPassword = async (reqBody) => {
  const { email, password, confirm_password, token } = reqBody;
  if (!email || !password || !confirm_password || !token) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please Enter Required Fields : [ email, password, confirm_password, token ]"
    );
  }

  const user = await Admin.findOne({
    where: { email: email, remember_token: token, is_active: true },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid Email or Token");
  }

  if (password !== confirm_password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "New Password and Confirm Password Must Be Equal"
    );
  }

  const salt = bcrypt.genSaltSync(10);
  user.password = bcrypt.hashSync(confirm_password, salt);
  user.remember_token = null;
  await user.save();

  return "Password Changed Successfully.";
};

const getProfile = async (reqBody) => {
  const { user } = reqBody;

  const result = await Admin.findOne({
    attributes: ["id", "name", "email", "role_id", "department_id"],
    include: ADMIN_INCLUDE,
    where: { id: user.id, is_active: true },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin profile not found.");
  }

  return result;
};

// A super admin editing an admin account (possibly their own). Guards keep
// at least one super admin and stop anyone changing their own role.
const updateAdmin = async (id, reqBody, currentAdmin) => {
  const adminDoc = await Admin.findOne({
    where: { id: id, is_active: true },
    include: [{ model: Role, as: "admin_role" }],
  });

  if (!adminDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found.");
  }

  const isSelf = !!currentAdmin && Number(currentAdmin.id) === Number(adminDoc.id);

  if (typeof reqBody.name !== "undefined") {
    const name = typeof reqBody.name === "string" ? reqBody.name.trim() : "";
    if (!name) throw badRequest("Name can't be empty.");
    adminDoc.name = name;
  }

  if (typeof reqBody.email !== "undefined") {
    const email =
      typeof reqBody.email === "string" ? reqBody.email.trim().toLowerCase() : "";
    if (!email || !validateEmail(email)) throw badRequest("Invalid Email");
    if (email !== adminDoc.email) {
      const taken = await Admin.findOne({
        where: { email, is_active: true, id: { [Op.ne]: adminDoc.id } },
        attributes: ["id"],
      });
      if (taken) throw badRequest("Email already taken");
      adminDoc.email = email;
    }
  }

  if (!isBlank(reqBody.role_id)) {
    const roleId = Number(reqBody.role_id);
    const role = Number.isInteger(roleId) ? await Role.findByPk(roleId) : null;
    if (!role || !adminPanelRoles.includes(role.abbreviation)) {
      throw badRequest("This role can't be given to an admin.");
    }
    if (roleId !== Number(adminDoc.role_id)) {
      if (isSelf) {
        throw badRequest("You can't change your own role. Ask another Super Admin.");
      }
      const demotingSuperAdmin =
        adminDoc.admin_role?.abbreviation === rolesTypes.SUP_ADM &&
        role.abbreviation !== rolesTypes.SUP_ADM;
      if (demotingSuperAdmin && (await countOtherSuperAdmins(adminDoc.id)) === 0) {
        throw badRequest(LAST_SUPER_ADMIN);
      }
      adminDoc.role_id = roleId;
    }
  }

  if (!isBlank(reqBody.department_id)) {
    const departmentId = Number(reqBody.department_id);
    const department = Number.isInteger(departmentId)
      ? await Department.findByPk(departmentId)
      : null;
    if (!department) throw badRequest("Invalid Department Id");
    adminDoc.department_id = departmentId;
  }

  if (currentAdmin) adminDoc.updated_by = currentAdmin.id;
  await adminDoc.save();
  return findAdminById(adminDoc.id);
};

const deleteAdmin = async (id, currentAdmin) => {
  const admin = await Admin.findOne({
    where: { id: id, is_active: true },
    include: [{ model: Role, as: "admin_role" }],
  });
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }
  if (currentAdmin && Number(currentAdmin.id) === Number(admin.id)) {
    throw badRequest("You can't delete your own account.");
  }
  if (
    admin.admin_role?.abbreviation === rolesTypes.SUP_ADM &&
    (await countOtherSuperAdmins(admin.id)) === 0
  ) {
    throw badRequest(LAST_SUPER_ADMIN);
  }
  if (currentAdmin) admin.deleted_by = currentAdmin.id;
  await admin.destroy();
  return true;
};

const getAllAdmins = async () => {
  const userDoc = await Admin.findAll({
    where: { is_active: true },
    attributes: ADMIN_ATTRIBUTES,
    include: ADMIN_INCLUDE,
    order: [
      ["created_at", "ASC"],
      ["id", "ASC"],
    ],
  });
  return userDoc;
};

module.exports = {
  createAdminUser,
  loginAdminUser,
  resetAdminPassword,
  sendOTP,
  verifyOTP,
  forgotAdminPassword,
  getProfile,
  findAdminById,
  updateAdmin,
  deleteAdmin,
  getAllAdmins,
};
