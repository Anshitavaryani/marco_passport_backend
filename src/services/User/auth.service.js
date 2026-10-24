const httpStatus = require("http-status");
const bcrypt = require("bcrypt");
const { toZonedTime, format: formatTz } = require("date-fns-tz");

const { User, Profile, userLoginTiming, Timezone } = require("../../models");
const sequelize = require("../../config/central.db");
const config = require("../../config/config");
const ApiError = require("../../utils/ApiError");
const logger = require("../../config/logger");
const validatePassword = require("../../helpers/validatePassword");
const tokenService = require("../Common/token.service");
const emailService = require("../Common/email.service");
const { userStatusTypes, tokenTypes } = require("../../config/types");

const HOUR_MS = 60 * 60 * 1000;
// Unverified accounts are deleted this long after sign-up
// (src/jobs/cleanupUnverifiedUsers.js); the verify link expires with them.
const UNVERIFIED_ACCOUNT_TTL_MS = 24 * HOUR_MS;
const PASSWORD_RESET_TTL_MS = HOUR_MS;
// Minimum gap between "send me another email" requests per user.
const EMAIL_RESEND_THROTTLE_MS = 60 * 1000;
// One password change or reset per user in this window.
const PASSWORD_CHANGE_COOLDOWN_MS = 12 * HOUR_MS;

const PASSWORD_RULES_MESSAGE =
  "Password should have a minimum length of 8 characters and must have at least 2 digits and No Blank Space";

const isValidTimezone = (tz) => {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const hashPassword = (password) => bcrypt.hashSync(password, bcrypt.genSaltSync(10));

// The site has no separate auth pages: these open the matching dialog over
// the home page. (Old /verify-email and /reset-password links redirect there.)
const verifyEmailUrl = (token) =>
  `${config.frontendUrl}/?auth=verify-email&token=${encodeURIComponent(token)}`;
const resetPasswordUrl = (token) =>
  `${config.frontendUrl}/?auth=reset-password&token=${encodeURIComponent(token)}`;

// Throws if the user changed or reset their password within the cooldown.
const assertPasswordChangeAllowed = (user) => {
  const lastChange = user.password_changed_at ? new Date(user.password_changed_at).getTime() : 0;
  const waitMs = lastChange + PASSWORD_CHANGE_COOLDOWN_MS - Date.now();
  if (waitMs <= 0) return;
  const wait =
    waitMs < HOUR_MS
      ? `${Math.ceil(waitMs / 60000)} minutes`
      : `${Math.max(1, Math.round(waitMs / HOUR_MS))} hours`;
  throw new ApiError(
    httpStatus.TOO_MANY_REQUESTS,
    `You changed your password recently. You can change it again in about ${wait}.`
  );
};

// Session payload shared by login and verify-email (which logs the user in).
const startSession = async (user, { ip_address, timezone } = {}) => {
  const token = await tokenService.generateAuthTokens(user);
  try {
    await saveLoginTiming(user, token, { ip_address }, timezone);
  } catch (error) {
    logger.warn(`saveLoginTiming failed for user ${user.id}: ${error.message}`);
  }
  delete token.access.id;
  delete token.refresh.id;

  const profile = await Profile.findOne({
    where: { user_id: user.id },
    attributes: ["name"],
  });
  return {
    id: user.id,
    name: profile ? profile.name : null,
    email: user.email,
    tokens: token,
    role_id: user.role_id,
  };
};

// Creates the account as PENDING and emails a verify link. If the email
// can't be sent, nothing is saved, so the user can simply try again.
const register = async (body, headers) => {
  const { name, email, password } = body;
  const { role_id } = headers;

  await sequelize.transaction(async (transaction) => {
    const user = await User.create(
      {
        email,
        password: hashPassword(password),
        role_id,
        status: userStatusTypes.PENDING,
      },
      { transaction }
    );
    await Profile.create({ email, name, user_id: user.id }, { transaction });

    const rawToken = await tokenService.createOneTimeToken(
      user,
      tokenTypes.VERIFY_EMAIL,
      UNVERIFIED_ACCOUNT_TTL_MS,
      transaction
    );
    try {
      await emailService.sendVerificationEmail(email, verifyEmailUrl(rawToken));
    } catch (error) {
      logger.error(`Verification email to user ${user.id} failed: ${error.message}`);
      throw new ApiError(
        httpStatus.SERVICE_UNAVAILABLE,
        "We couldn't send the verification email. Please try again in a few minutes."
      );
    }
  });

  return { email };
};

// Confirms the email from the link and logs the user straight in.
const verifyEmail = async (token, meta) => {
  const tokenDoc = await tokenService.findValidOneTimeToken(token, tokenTypes.VERIFY_EMAIL);
  const user =
    tokenDoc &&
    (await User.findOne({ where: { id: tokenDoc.user_id, is_active: true } }));
  if (!user) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This verification link is invalid or has expired."
    );
  }

  user.status = userStatusTypes.ACCEPTED;
  await user.save();
  await tokenService.revokeTokens(user.id, tokenTypes.VERIFY_EMAIL);
  return startSession(user, meta);
};

// Always answers the same way, so it can't be used to probe which emails
// have accounts. Email failures are logged, not returned, for the same reason.
const resendVerification = async (email, role_id) => {
  if (!email) throw new ApiError(httpStatus.BAD_REQUEST, "Please enter your email.");

  const user = await User.findOne({
    where: { email, role_id, is_active: true, status: userStatusTypes.PENDING },
  });
  if (!user) return;
  if (
    await tokenService.wasTokenIssuedRecently(
      user.id,
      tokenTypes.VERIFY_EMAIL,
      EMAIL_RESEND_THROTTLE_MS
    )
  ) {
    return;
  }

  // The link never outlives the account itself.
  const ttl = new Date(user.created_at).getTime() + UNVERIFIED_ACCOUNT_TTL_MS - Date.now();
  if (ttl <= 0) return;

  const rawToken = await tokenService.createOneTimeToken(user, tokenTypes.VERIFY_EMAIL, ttl);
  try {
    await emailService.sendVerificationEmail(email, verifyEmailUrl(rawToken));
  } catch (error) {
    logger.error(`Verification email to user ${user.id} failed: ${error.message}`);
  }
};

const login = async (reqBody, headers) => {
  const { role_id, timezone } = headers;
  const user = await User.findOne({
    where: { email: reqBody.email, is_active: true, role_id: role_id },
  });

  const validPass = user && (await bcrypt.compare(reqBody.password, user.password));
  if (!validPass) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Error: Invalid email or password. Please try again."
    );
  }

  if (user.status === userStatusTypes.PENDING) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Please verify your email before logging in. Check your inbox for the verification link."
    );
  }
  if (user.status !== userStatusTypes.ACCEPTED) {
    throw new ApiError(httpStatus.FORBIDDEN, "This account is not active.");
  }

  return startSession(user, { ip_address: reqBody.ip_address, timezone });
};

// Logged-in password change (knows the old password).
const changePassword = async (reqBody) => {
  const { confirm_password, old_password, user, tokenDoc } = reqBody;

  assertPasswordChangeAllowed(user);

  const validPass = await bcrypt.compare(old_password, user?.password);
  if (!validPass) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Incorrect Old Password.");
  }

  user.password = hashPassword(confirm_password);
  user.password_changed_at = new Date();
  await user.save();

  await tokenDoc.destroy({ force: true });
  const token = await tokenService.generateAuthTokens(user);
  return { tokens: token };
};

// Step 1 of "forgot password": email a reset link. Same response whether or
// not the account exists.
const forgotPassword = async (email, role_id) => {
  if (!email) throw new ApiError(httpStatus.BAD_REQUEST, "Please enter your email.");

  const user = await User.findOne({
    where: { email, role_id, is_active: true, status: userStatusTypes.ACCEPTED },
  });
  if (!user) return;
  if (
    await tokenService.wasTokenIssuedRecently(
      user.id,
      tokenTypes.FORGOT_PASSWORD,
      EMAIL_RESEND_THROTTLE_MS
    )
  ) {
    return;
  }

  const rawToken = await tokenService.createOneTimeToken(
    user,
    tokenTypes.FORGOT_PASSWORD,
    PASSWORD_RESET_TTL_MS
  );
  try {
    await emailService.sendPasswordResetEmail(email, resetPasswordUrl(rawToken));
  } catch (error) {
    logger.error(`Password reset email to user ${user.id} failed: ${error.message}`);
  }
};

// Step 2: set a new password from the emailed link. Signs out every
// existing session.
const resetPassword = async ({ token, password, confirm_password }) => {
  if (!password || !confirm_password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please Enter Required Fields : [ password || confirm_password ]"
    );
  }
  if (!validatePassword(password)) {
    throw new ApiError(httpStatus.BAD_REQUEST, PASSWORD_RULES_MESSAGE);
  }
  if (password !== confirm_password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Password and Confirm Password must be equal."
    );
  }

  const tokenDoc = await tokenService.findValidOneTimeToken(token, tokenTypes.FORGOT_PASSWORD);
  const user =
    tokenDoc &&
    (await User.findOne({ where: { id: tokenDoc.user_id, is_active: true } }));
  if (!user) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This password reset link is invalid or has expired."
    );
  }
  assertPasswordChangeAllowed(user);

  await sequelize.transaction(async (transaction) => {
    user.password = hashPassword(password);
    user.password_changed_at = new Date();
    await user.save({ transaction });
    await tokenService.revokeTokens(user.id, tokenTypes.FORGOT_PASSWORD, transaction);
    await tokenService.revokeTokens(user.id, tokenTypes.ACCESS, transaction);
  });
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
  UNVERIFIED_ACCOUNT_TTL_MS,
  PASSWORD_RULES_MESSAGE,
  register,
  verifyEmail,
  resendVerification,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
};