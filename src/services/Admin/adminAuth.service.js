const bcrypt = require("bcryptjs");
const httpStatus = require("http-status");
const jwt = require("jsonwebtoken");

const { Admin } = require("../../models");
const ApiError = require("../../utils/ApiError");
const config = require("../../config/config");
const { emailService } = require("../Common");
const { otpTypes } = require("../../config/types");
const generateOTP = require("../../utils/generateOTP");

// Admin OTPs are valid for 5 minutes, matching the window the user-side
// OTP flow uses (otp.model.js's beforeValidate hook). Admin OTP state
// lives directly on the Admin row (otp/is_otp_valid columns) rather than
// the shared OTP table, so there's no otp_expiration_time column to
// check against — this uses updated_at instead, which already bumps
// automatically whenever sendOTP below writes a new otp value. Zero
// migration needed, but it's a workaround: the OTP table already has
// proper expiration built in, and having two parallel OTP
// implementations (this one, and the user-side one) is worth
// consolidating onto the OTP table properly at some point.
const OTP_VALIDITY_MS = 5 * 60 * 1000;

const createAdminUser = async (userBody) => {
  const salt = bcrypt.genSaltSync(10);
  const userObj = {
    name: userBody.name,
    email: userBody.email,
    password: bcrypt.hashSync(userBody.password, salt),
    role_id: userBody.role_id,
    department_id: userBody.department_id,
  };
  const user = await Admin.create(userObj);
  if (!user) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create User"
    );
  }
  return user;
};

// Signs the JWT payload the same way for both admin auth entry points
// (login and OTP-based password reset) — see the note above about why
// this matters.
const signAdminToken = (user, expiresIn) => {
  // Was: jwt.sign(payload, Buffer.from(config.jwt.secret, 'hex'), {...})
  // — the secret was never actually hex-encoded at any point, so
  // wrapping it in Buffer.from(secret, 'hex') here (Node's hex decoder
  // silently truncates at the first non-hex character rather than
  // throwing) checked/produced a signature against a weakened,
  // truncated version of the real secret rather than the real thing.
  // This matched adminAuth.middleware.js's *original* verify code
  // (which did the same truncation), so it was self-consistent, if
  // cryptographically weak. That middleware's verify was fixed a few
  // turns ago to use the plain secret — which means sign and verify no
  // longer matched at all until this fix. Also switched the payload's
  // `id` claim to `sub`, matching the JWT standard and the
  // already-correct middleware (which reads payload.sub). Also
  // dropped `is_backlisted: false` — it was hardcoded false at every
  // signing site with no code path ever able to set it true, so it
  // was pure decoration, not a real revocation mechanism.
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

  // Was randomize('0', 6) — see utils/generateOTP.js for why.
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

  // Was missing entirely — an admin OTP never expired once generated.
  // See the OTP_VALIDITY_MS note above for why this uses updated_at
  // rather than a dedicated expiration column.
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

module.exports = {
  createAdminUser,
  loginAdminUser,
  resetAdminPassword,
  sendOTP,
  verifyOTP,
  forgotAdminPassword,
};
