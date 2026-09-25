const bcrypt = require("bcrypt");
const httpStatus = require("http-status");
const jwt = require("jsonwebtoken");

const { Admin, Role } = require("../../models");
const ApiError = require("../../utils/ApiError");
const config = require("../../config/config");
const { emailService } = require("../Common");
const { otpTypes } = require("../../config/types");
const generateOTP = require("../../utils/generateOTP");
const { sendAdminCredentials } = require("../Common/email.service");

const OTP_VALIDITY_MS = 5 * 60 * 1000;

const createAdminUser = async (userBody) => {
	try {
		const password = Math.random().toString(36).substring(2, 12);
		let salt = bcrypt.genSaltSync(10);
		const userObj = {
			name: userBody.name,
			email: userBody.email,
			password: bcrypt.hashSync(password, salt),
			role_id: userBody.role_id,
			department_id: userBody.department_id,
		};
		const user = await Admin.create(userObj);

		if (!user) {
			throw new ApiError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Failed to create new admin",
			);
		}
		let result = await Admin.findOne({
			attributes: ["id", "name", "email", "role_id", "department_id"],
			include: [
				{
					model: Role,
					as: "admin_role",
					attributes: ["id", "name", "abbreviation"],
				},
			
			],

			where: { id: user?.id, is_active: true },
		});

		let isSend = await sendAdminCredentials(userBody.email, password);
		if (!isSend) {
			throw new ApiError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Unable to send Credentials to This Email",
			);
		}
		if (!result)
			throw new ApiError(httpStatus.BAD_REQUEST, "Failed to Get Profile.");
		return result;
	} catch (error) {
		throw new ApiError(
			error.statusCode ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR,
			error.message,
		);
	}
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
    include: [
      {
        model: Role,
        as: "admin_role",
        attributes: ["id", "name", "abbreviation"],
      },
    ],
    where: { id: user.id, is_active: true },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin profile not found.");
  }

  return result;
};

const findAdminById = async (id) => {
  const adminDoc = await Admin.findOne({
    where: { id: id, is_active: true },
    include: [
      {
        model: Role,
        as: "admin_role",
      },
    ],
  });
  if (!adminDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found.");
  }
  return adminDoc;
};

const updateAdmin = async (id, reqBody) => {
  const adminDoc = await Admin.findOne({
    where: { id: id, is_active: true },
  });

  if (!adminDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found.");
  }

  if (
    reqBody.name &&
    reqBody.name !== "" &&
    typeof reqBody.name !== "undefined"
  ) {
    adminDoc["name"] = reqBody.name;
  }

  if (
    reqBody.email &&
    reqBody.email !== "" &&
    typeof reqBody.email !== "undefined"
  ) {
    adminDoc["email"] = reqBody.email;
  }
  if (
    reqBody.role_id &&
    reqBody.role_id !== "" &&
    typeof reqBody.role_id !== "undefined"
  ) {
    adminDoc["role_id"] = reqBody.role_id;
  }

  await adminDoc.save();
  return adminDoc;
};

const deleteAdmin = async (id) => {
  const admin = await Admin.findOne({
    where: { id: id, is_active: true },
  });
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }
  await admin.destroy();
  return true;
};

const getAllAdmins = async () => {
  const userDoc = await Admin.findAll({
    where: { is_active: true },
    include: [
      {
        model: Role,
        as: "admin_role",
      },
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