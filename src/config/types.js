const userStatusTypes = {
  ACCEPTED: "ACCEPTED",
  PENDING: "PENDING",
  REJECTED: "REJECTED",
  REVIEWING: "REVIEWING",
  REVIEWED: "REVIEWED",
};

const paymentModeTypes = {
  CREDIT_CARD: "CREDIT_CARD",
  DEBIT_CARD: "DEBIT_CARD",
  PHONE_PAY: "PHONE_PAY",
  GOOGLE_PAY: "GOOGLE_PAY",
  BANK_ACCOUNT: "BANK_ACCOUNT",
  CARD: "CARD",
  UNKNOWN: "UNKNOWN",
};

// NOTE: 'varification' is a typo for 'verification' in these string VALUES,
// not just the JS keys. Left unchanged deliberately — these values almost
// certainly already exist as persisted rows in an `otp`/`user_tokens` type
// column somewhere. Fixing the spelling here would silently break matching
// against existing data. If you want this fixed, it needs a DB backfill
// (UPDATE ... SET type = 'email_verification' WHERE type = 'email_varification')
// run alongside the code change, not a silent rename.
const otpTypes = {
  EMAIL_VERIFICATION: "email_varification",
  MOBILE_VERIFICATION: "mobile_varification",
  FORGOT_PASSWORD: "forgot_password",
  RESET_PASSWORD: "reset_password",
};

const paymentStatusTypes = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  REJECTED: "REJECTED",
  REFUNDED: "REFUNDED",
};

// config.js defines role-ID env vars for 7 roles: SUP_ADM, ADM, SUB_ADM,
// ENG, EDTR, USR, and SP — but this object only had names for 6 of them,
// and used the key `CUSTOMER` where the env var naming convention (USR_ROLE_ID)
// suggests `USR`. Added `USR` as the primary key (same value, 'User', so
// nothing that reads the string value is affected) and kept `CUSTOMER` as
// an alias since some file I haven't reviewed yet may already import it —
// once everything's audited, the alias can be dropped.
//
// `SP_ROLE_ID` still has no corresponding entry here at all — I don't know
// what "SP" is meant to represent (Service Provider? Sales Person?), so I
// haven't guessed at a value. Let me know and I'll add it.
const rolesTypes = {
  ADM: "Admin",
  SUP_ADM: "Super Admin",
  SUB_ADM: "Sub Admin",
  ENG: "Engineer",
  EDTR: "Editor",
  USR: "User",
  CUSTOMER: "User", // deprecated alias for USR — consolidate once all usages are confirmed
};

const bookingTypes = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  REJECTED: "REJECTED",
  ESTIMATE: "ESTIMATE",
};

const tokenTypes = {
  ACCESS: "access",
  REFRESH: "refresh",
  VERIFY_EMAIL: "email_varification", // matches otpTypes.EMAIL_VERIFICATION — see note above
  FORGOT_PASSWORD: "forgot_password",
  RESET_PASSWORD: "reset_password",
  SESSION: "session",
};

// Renamed export from `currancyTypes` to the correctly-spelled
// `currencyTypes`. Kept the old misspelled name as an alias pointing at the
// same object so any file that already imports `currancyTypes` still works
// — drop the alias once everything's been switched over to the new name.
const currencyTypes = {
  USD: "USD",
  INR: "INR",
  EUR: "EUR",
  OMR: "OMR",
  CHF: "CHF",
  KYD: "KYD",
};

module.exports = {
  userStatusTypes,
  paymentModeTypes,
  otpTypes,
  paymentStatusTypes,
  rolesTypes,
  bookingTypes,
  tokenTypes,
  currencyTypes,
  currancyTypes: currencyTypes, // deprecated alias — see note above
};
