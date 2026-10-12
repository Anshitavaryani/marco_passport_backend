const passwordValidator = require("password-validator");

// bcrypt only uses the first 72 bytes of a password, so cap it there.
const MAX_BCRYPT_BYTES = 72;

const schema = new passwordValidator();

schema
  .is()
  .min(8) // Minimum length 8
  .is()
  .max(MAX_BCRYPT_BYTES)
  .has()
  .digits(2) // Must have at least 2 digits
  .has()
  .not()
  .spaces(); // Should not have spaces
// .has().uppercase()                              // uncomment to require at least one uppercase letter
// .has().lowercase()                              // uncomment to require at least one lowercase letter

// NOTE: a two-entry blacklist is minimal; use a common-password list or
// zxcvbn for real strength checks.
schema.is().not().oneOf(["Passw0rd", "Password123"]);

const validatePassword = function (pass) {
  if (typeof pass !== "string") {
    return false;
  }
  // .max() counts UTF-16 code units; bcrypt's limit is in bytes.
  if (Buffer.byteLength(pass, "utf8") > MAX_BCRYPT_BYTES) {
    return false;
  }
  return schema.validate(pass);
};

module.exports = validatePassword;
