const jwt = require("jsonwebtoken");
const { addMinutes } = require("date-fns");
const httpStatus = require("http-status");

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
  // Was a raw `INSERT INTO user_tokens (...) VALUES ('${userId}', ...)`
  // built with template-string interpolation — string-concatenating
  // request-adjacent values directly into SQL is a SQL-injection
  // surface waiting to be exploited the moment any of these values
  // ever comes from less-trusted input than they currently do.
  // UserToken was already imported here but unused for this — the ORM
  // method is no more code and removes the raw-SQL surface entirely.
  const tokenDoc = await UserToken.create({
    user_id: userId,
    token_type: type,
    token: token,
    expired_at: expires,
    role_id: role_id,
  });
  return tokenDoc;
};

const verifyToken = async (token, type) => {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch (jwtError) {
    const message =
      jwtError.name === "TokenExpiredError"
        ? "Token has expired. Please log in again."
        : "Invalid Token";
    throw new ApiError(httpStatus.UNAUTHORIZED, message);
  }

  const tokenDoc = await UserToken.findOne({
    where: {
      token: token,
      token_type: type,
      user_id: payload.sub,
    },
  });
  if (!tokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Token not found");
  }
  if (tokenDoc.expired_at < new Date()) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Token is expired. Please log in again."
    );
  }
  return tokenDoc;
};

const generateAuthTokens = async (user) => {
  if (!user) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Error: Invalid User");
  }

  // Fixed a real bug: this used to be
  //   moment().add(config.jwt.accessExpirationMinutes, 'days')
  // — adding a value that's named, documented, and configured as
  // MINUTES (JWT_ACCESS_EXPIRATION_MINUTES) using a DAYS unit. Access
  // tokens were living ~720x longer than intended (a token configured
  // for 30 minutes was actually expiring in 30 days) — a real
  // undermining of the whole point of a short-lived access token.
  // (This pairs with an earlier fix in config.js, which was reading a
  // nonexistent env var and left this value `undefined` before that —
  // so this completes that fix rather than duplicating it.)
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

module.exports = {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
};
