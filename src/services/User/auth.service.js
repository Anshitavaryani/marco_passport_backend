const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");
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
const { otpTypes } = require("../../config/types");
const generateOTP = require("../../utils/generateOTP");
// Was require('../../utils/randomStringGenrate') — that file was
// renamed (typo fix) several turns back; this was the one remaining
// import still pointing at the old misspelled path.
const generateRandomString = require("../../utils/randomStringGenerate");

// Maps each multer upload field (see multer.js) to the file_type value
// stored on the UserAttachment record.
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

  // Was randomize('0', 4) — see utils/generateOTP.js.
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
    // Added role_id to this filter — it was missing, so verifying
    // one role-scoped account's email (a person can hold more than
    // one account under the same email, scoped by role_id — see
    // User.isEmailTaken(email, role_id)) could mark EVERY account
    // under that email as ACCEPTED, not just the one actually being
    // verified.
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

const register = async (body, files, headers) => {
  const { name, email, mobile, password, confirm_password } = body;
  const { role_id } = headers;
  const salt = bcrypt.genSaltSync(10);
  const userObj = {
    email: email,
    password: bcrypt.hashSync(password, salt),
    role_id: role_id,
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
    mobile: mobile,
    user_id: user.id,
  };
  const userProfile = await Profile.create(profileObj);
  if (!userProfile)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create New Record"
    );

  const existingOtp = await OTP.findOne({
    where: {
      email: email,
      type: otpTypes.EMAIL_VERIFICATION,
      role_id: role_id,
    },
  });
  if (existingOtp) await existingOtp.destroy({ force: true });

  const generatedOTP = generateOTP(4);
  const otpObj = {
    user_id: user.id,
    email: email,
    code: generatedOTP,
    type: otpTypes.EMAIL_VERIFICATION,
    role_id: role_id,
  };
  const otpDoc = await OTP.create(otpObj);
  if (!otpDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to generate new OTP."
    );
  }
  await sendEmailVerification(email, generatedOTP);

  // Was an if/else-if chain checking only files.images then
  // files.gifs — meaning if a request uploaded BOTH images and gifs
  // together, the gifs were silently never saved as UserAttachment
  // records (though multer had already written them to disk,
  // orphaned with no DB reference). videos/docs/songs — all valid
  // multer fields per multer.js — weren't handled at all. This
  // handles every upload field independently.
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
    // Login-timing is analytics, not auth — a failure here (an
    // unrecognized timezone header, a transient DB hiccup) must
    // never block someone with valid credentials from logging in.
    // This wasn't wrapped before, so saveLoginTiming throwing (e.g.
    // a bad timezone causing a null-dereference inside it, fixed
    // below too) failed the entire login.
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
  // Was moment.tz(loginTimeUTC, timezone) — moment-timezone silently
  // falls back/produces an invalid moment for a bad timezone string
  // rather than throwing, which just meant bad data got stored quietly.
  // Intl.DateTimeFormat throws a RangeError for an invalid IANA
  // timezone, which is what's used here to validate before conversion
  // rather than after.
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
  // Was: `time_zone: timeZoneDoc.id` with no null check — if the
  // client's timezone (or the UTC fallback) isn't in the seeded
  // Timezone table, this threw a TypeError reading .id off null,
  // which (before the try/catch added at the login() call site above)
  // used to fail the entire login.
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
  // Was storing the raw moment object directly (unlike
  // saveLoginTiming, which formatted it to a string first) —
  // inconsistent between the two, now matching.
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
