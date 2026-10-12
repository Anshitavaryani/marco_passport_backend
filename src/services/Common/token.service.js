const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { addMinutes } = require("date-fns");
const httpStatus = require("http-status");
const { Op } = require("sequelize");

const config = require("../../config/config");
const { UserToken } = require("../../models");
const { tokenTypes } = require("../../config/types");
const ApiError = require("../../utils/ApiError");

const generateToken = (
  userId,
  expires,
  type,
  role_id,
  secret = config.jwt.secret
) => {
  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expires.getTime() / 1000),
    type,
    role_id: role_id,
  };
  return jwt.sign(payload, secret);
};

const saveToken = async (token, userId, expires, type, role_id) => {
  const tokenDoc = await UserToken.create({
    user_id: userId,
    token_type: type,
    token: token,
    expired_at: expires,
    role_id: role_id,
  });
  return tokenDoc;
};

const generateAuthTokens = async (user) => {
  if (!user) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Error: Invalid User");
  }

  const accessTokenExpires = addMinutes(
    new Date(),
    config.jwt.accessExpirationMinutes
  );
  const accessToken = generateToken(
    user.id,
    accessTokenExpires,
    tokenTypes.ACCESS,
    user.role_id
  );

  const tokenDoc = await saveToken(
    accessToken,
    user.id,
    accessTokenExpires,
    tokenTypes.ACCESS,
    user.role_id
  );

  return {
    access: {
      id: tokenDoc.id,
      token: accessToken,
      expires: accessTokenExpires,
    },
    refresh: {
      id: "",
      token: "",
      expires: "",
    },
  };
};

// ---------------------------------------------------------------------
// Single-use email-link tokens (verify email, reset password).
// The raw token only ever goes into the emailed link; the DB stores its
// SHA-256 hash, so a leaked user_tokens table can't be used to log in.
// ---------------------------------------------------------------------
const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

// Replaces any previous token of the same type, so only the latest link works.
const createOneTimeToken = async (user, type, ttlMs, transaction) => {
  await UserToken.destroy({
    where: { user_id: user.id, token_type: type },
    force: true,
    transaction,
  });
  const raw = crypto.randomBytes(32).toString("hex");
  await UserToken.create(
    {
      user_id: user.id,
      role_id: user.role_id,
      token_type: type,
      token: hashToken(raw),
      expired_at: new Date(Date.now() + ttlMs),
    },
    { transaction }
  );
  return raw;
};

const findValidOneTimeToken = async (raw, type) => {
  if (typeof raw !== "string" || !/^[a-f0-9]{64}$/.test(raw)) return null;
  return UserToken.findOne({
    where: {
      token: hashToken(raw),
      token_type: type,
      is_active: true,
      expired_at: { [Op.gt]: new Date() },
    },
  });
};

// Throttle for "send me another email" endpoints.
const wasTokenIssuedRecently = async (userId, type, withinMs) => {
  const count = await UserToken.count({
    where: {
      user_id: userId,
      token_type: type,
      created_at: { [Op.gt]: new Date(Date.now() - withinMs) },
    },
  });
  return count > 0;
};

const revokeTokens = async (userId, type, transaction) =>
  UserToken.destroy({
    where: { user_id: userId, token_type: type },
    force: true,
    transaction,
  });

module.exports = {
  generateAuthTokens,
  createOneTimeToken,
  findValidOneTimeToken,
  wasTokenIssuedRecently,
  revokeTokens,
};
