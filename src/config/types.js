const userStatusTypes = {
  ACCEPTED: "ACCEPTED",
  PENDING: "PENDING",
  REJECTED: "REJECTED",
  REVIEWING: "REVIEWING",
  REVIEWED: "REVIEWED",
};

const otpTypes = {
  FORGOT_PASSWORD: "forgot_password",
};

// Matched against roles.abbreviation (stable), not roles.name (display text).
const rolesTypes = {
  SUP_ADM: "SUP_ADM",
  ADM: "ADM",
  SUB_ADM: "SUB_ADM",
  ENG: "ENG",
  EDTR: "EDTR",
};

// NOTE: 'varification' is a typo, but VERIFY_EMAIL's value is persisted in
// the user_tokens.token_type ENUM — fixing it needs a DB migration.
const tokenTypes = {
  ACCESS: "access",
  REFRESH: "refresh",
  VERIFY_EMAIL: "email_varification",
  FORGOT_PASSWORD: "forgot_password",
  RESET_PASSWORD: "reset_password",
  SESSION: "session",
};

module.exports = {
  userStatusTypes,
  otpTypes,
  rolesTypes,
  tokenTypes,
};
