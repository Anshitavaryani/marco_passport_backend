const httpStatus = require("http-status");
const bcrypt = require("bcrypt");
const { toZonedTime, format: formatTz } = require("date-fns-tz");

const {
  OTP,
  User,
  UserAttachment,
  Profile,
  userLoginTiming,
  Timezone,
} = require("../../models");
const validateEmail = require("../../helpers/validateEmail");
const ApiError = require("../../utils/ApiError");
const logger = require("../../config/logger");
const {
  sendForgotPasswordOTP,
  sendEmailVerification,
} = require("../Common/email.service");
const { generateAuthTokens } = require("../Common/token.service");
const { otpTypes, userStatusTypes } = require("../../config/types");
const generateOTP = require("../../utils/generateOTP");
const generateRandomString = require("../../utils/randomStringGenrate");

const UPLOAD_FIELD_TYPES = {
  images: "Image",
  gifs: "Gif",
  videos: "Video",
  docs: "Document",
  songs: "Audio",
};

const isValidTimezone = (tz) => {
  if (!tz) return false;
  try {
    // eslint-disable-next-line no-new
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// sendOTP / verifyOTP are kept fully intact and exported below, even
// though nothing currently calls them — OTP-based email verification
// is disabled site-wide for now (frontend captcha handles bot
// prevention at signup instead), not removed. See the commented block
// inside register() for how to turn it back on.
const sendOTP = async (body, headers) => {
  const { email, type } = body;
  const { role_id } = headers;

  if (!validateEmail(email) || !Object.values(otpTypes).includes(type)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Email or Type.");
  }

  const existingOtp = await OTP.findOne({
    where: { email: body?.email, type: body?.type, role_id: role_id },
  });
  if (existingOtp) await existingOtp.destroy({ force: true });

  const generatedOTP = generateOTP(4);
  const otpObj = {
    email: email,
    code: generatedOTP,
    type: type,
    role_id: role_id,
  };
  const otpDoc = await OTP.create(otpObj);
  if (!otpDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to generate new OTP."
    );
  }
  if (type === otpTypes.FORGOT_PASSWORD) {
    await sendForgotPasswordOTP(email, generatedOTP);
  } else if (type === otpTypes.EMAIL_VERIFICATION) {
    await sendEmailVerification(email, generatedOTP);
  }
  return true;
};

const verifyOTP = async (email, otp, type, role_id) => {
  if (!email || !otp || !type || !role_id) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please Enter Required Fields : [email, otp, type, role_id]"
    );
  }

  const otpDoc = await OTP.findOne({
    where: {
      email: email,
      type: type,
      is_active: true,
      is_verified: false,
      role_id: role_id,
    },
  });
  if (!otpDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Email or Type");
  }

  if (otp !== otpDoc.code) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP Entered");
  }

  if (otpDoc.otp_expiration_time < new Date()) {
    throw new ApiError(httpStatus.BAD_REQUEST, "OTP has been Expired");
  }

  otpDoc.is_active = false;
  otpDoc.is_verified = true;
  let isUpdate = false;
  let token = "";
  if (type !== otpTypes.FORGOT_PASSWORD) {
    const [affectedCount] = await User.update(
      { status: "ACCEPTED" },
      { where: { email: email, role_id: role_id, is_active: true } }
    );
    isUpdate = affectedCount > 0;
  } else {
    token = generateRandomString(50);
    otpDoc.code = token;
  }
  await otpDoc.save();
  return token ? { token } : isUpdate;
};

// Signup collects only name/email/password/confirm_password now — no
// mobile requirement, no OTP/email verification step. `mobile` is
// still accepted if the caller happens to send it (kept nullable on
// Profile), just no longer required or asked for by the frontend.
const register = async (body, files, headers) => {
  const { name, email, mobile, password } = body;
  const { role_id } = headers;
  const salt = bcrypt.genSaltSync(10);
  const userObj = {
    email: email,
    password: bcrypt.hashSync(password, salt),
    role_id: role_id,
    // OTP verification is disabled (see the commented block below), so
    // there's no separate step left to flip this from PENDING to
    // ACCEPTED — set directly here instead. Revert to the model's
    // default (PENDING) if OTP verification is re-enabled.
    status: userStatusTypes.ACCEPTED,
  };
  const user = await User.create(userObj);
  if (!user) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create New Record"
    );
  }

  const profileObj = {
    email: email,
    name: name,
    mobile: mobile || null,
    user_id: user.id,
  };
  const userProfile = await Profile.create(profileObj);
  if (!userProfile)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create New Record"
    );

  // --- OTP / email verification — disabled for now, kept for later ---
  // This site currently uses frontend captcha instead of an OTP
  // verification step at signup, and `status` is set to ACCEPTED
  // directly above. To re-enable this flow: uncomment the block below,
  // change the status above back to the model's default (PENDING), and
  // uncomment the /otp and /verify-otp routes in auth.route.js.
  //
  // const existingOtp = await OTP.findOne({
  //   where: {
  //     email: email,
  //     type: otpTypes.EMAIL_VERIFICATION,
  //     role_id: role_id,
  //   },
  // });
  // if (existingOtp) await existingOtp.destroy({ force: true });
  //
  // const generatedOTP = generateOTP(4);
  // const otpObj = {
  //   user_id: user.id,
  //   email: email,
  //   code: generatedOTP,
  //   type: otpTypes.EMAIL_VERIFICATION,
  //   role_id: role_id,
  // };
  // const otpDoc = await OTP.create(otpObj);
  // if (!otpDoc) {
  //   throw new ApiError(
  //     httpStatus.INTERNAL_SERVER_ERROR,
  //     "Failed to generate new OTP."
  //   );
  // }
  // await sendEmailVerification(email, generatedOTP);

  if (files) {
    for (const [field, fileType] of Object.entries(UPLOAD_FIELD_TYPES)) {
      const uploadedFiles = files[field];
      if (!uploadedFiles || uploadedFiles.length === 0) continue;
      for (const file of uploadedFiles) {
        await UserAttachment.create({
          role_id: role_id,
          user_id: user.id,
          title: "Profile Image",
          file_type: fileType,
          file_name: file.filename,
          file_uri: `/${field}`,
          file_size: file.size,
        });
      }
    }
  }

  return {};
};

const login = async (reqBody, headers) => {
  const { role_id, timezone } = headers;
  const user = await User.findOne({
    where: {
      email: reqBody.email,
      is_active: true,
      status: "ACCEPTED",
      role_id: role_id,
    },
  });
  if (!user) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Error: Customer not found. Please verify otp First"
    );
  }

  const validPass = await bcrypt.compare(reqBody.password, user.password);
  if (!validPass) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Error: Invalid email or password. Please try again."
    );
  }

  const token = await generateAuthTokens(user);

  if (token) {
    try {
      await saveLoginTiming(user, token, reqBody, timezone);
    } catch (error) {
      logger.warn(
        `saveLoginTiming failed for user ${user.id}: ${error.message}`
      );
    }
  }
  delete token.access.id;
  delete token.refresh.id;
  const userObj = {
    id: user.id,
    name: user.name,
    email: user.email,
    tokens: token,
    role_id: headers.role_id,
  };
  return userObj;
};

const resetPassword = async (reqBody) => {
  const { confirm_password, old_password, user, tokenDoc } = reqBody;

  const validPass = await bcrypt.compare(old_password, user?.password);
  if (!validPass) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Incorrect Old Password.");
  }

  const salt = bcrypt.genSaltSync(10);
  user.password = bcrypt.hashSync(confirm_password, salt);
  await user.save();

  await tokenDoc.destroy({ force: true });
  const token = await generateAuthTokens(user);
  return { tokens: token };
};

const forgotPassword = async (reqBody) => {
  const { password, confirm_password, user, otpDoc } = reqBody;

  if (password !== confirm_password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "New Password and Confirm Password Must Be Equal"
    );
  }

  const salt = bcrypt.genSaltSync(10);
  user.password = bcrypt.hashSync(confirm_password, salt);
  await user.save();

  await otpDoc.destroy({ force: true });
  return "";
};

const logout = async (reqBody, headers) => {
  const { tokenDoc } = reqBody;
  const { timezone } = headers;
  if (tokenDoc) {
    try {
      await saveLogoutTiming(tokenDoc, timezone);
    } catch (error) {
      logger.warn(
        `saveLogoutTiming failed for token ${tokenDoc.id}: ${error.message}`
      );
    }
  }
  await tokenDoc.destroy();
  return "";
};

const saveLoginTiming = async (user, token, reqBody, timezone) => {
  const loginTimeUTC = new Date();
  const safeTimezone = isValidTimezone(timezone) ? timezone : "UTC";
  const loginTimeLocal = formatTz(
    toZonedTime(loginTimeUTC, safeTimezone),
    "yyyy-MM-dd HH:mm:ss",
    {
      timeZone: safeTimezone,
    }
  );

  const timeZoneDoc = await Timezone.findOne({
    where: { time_zone: safeTimezone, is_active: true },
  });
  if (!timeZoneDoc) {
    logger.warn(
      `No matching Timezone row for "${safeTimezone}" — skipping login-timing record.`
    );
    return null;
  }

  const obj = {
    user_id: user.id,
    role_id: user.role_id,
    login_time_utc: loginTimeUTC,
    login_time_local: loginTimeLocal,
    ip_address: reqBody.ip_address,
    token_id: token.access.id,
    time_zone: timeZoneDoc.id,
  };

  return userLoginTiming.create(obj);
};

const saveLogoutTiming = async (tokenDoc, timezone) => {
  const logoutTimeUTC = new Date();
  const safeTimezone = isValidTimezone(timezone) ? timezone : "UTC";
  const logoutTimeLocal = formatTz(
    toZonedTime(logoutTimeUTC, safeTimezone),
    "yyyy-MM-dd HH:mm:ss",
    {
      timeZone: safeTimezone,
    }
  );

  const loginTimingDoc = await userLoginTiming.findOne({
    where: { token_id: tokenDoc.id },
  });
  if (loginTimingDoc) {
    loginTimingDoc.logout_time_utc = logoutTimeUTC;
    loginTimingDoc.logout_time_local = logoutTimeLocal;
    await loginTimingDoc.save();
    return loginTimingDoc;
  }
  return null;
};

module.exports = {
  register,
  login,
  resetPassword,
  sendOTP,
  verifyOTP,
  forgotPassword,
  logout,
};