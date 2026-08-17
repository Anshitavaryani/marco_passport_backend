const passwordValidator = require("password-validator");

// Passwords get hashed with bcrypt (see auth.service.js), and bcrypt only
// considers the first 72 BYTES of its input — everything past that is
// silently truncated before hashing. The schema previously allowed up to
// 100 characters, meaning a user with a 90-character password would
// reasonably assume all 90 characters protect them, when only the first 72
// bytes actually do (and two different passwords sharing those first 72
// bytes would hash identically). Capped to match what bcrypt actually
// protects.
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

// NOTE: this 2-entry blacklist gives close to no real protection against
// weak passwords — real strength checks compare against lists of
// thousands of known-common/breached passwords, or use scoring tools like
// zxcvbn. Left in place rather than removed (no reason to strip existing,
// if weak, protection), but if you want this actually meaningful, say so
// and I'll wire in zxcvbn or a proper common-password list instead.
schema.is().not().oneOf(["Passw0rd", "Password123"]);

const validatePassword = function (pass) {
  if (typeof pass !== "string") {
    return false;
  }
  // .max(72) above counts JS string length (UTF-16 code units), which
  // isn't the same as byte length once a password contains non-ASCII
  // characters (accents, emoji, etc.). This is the check that actually
  // matches bcrypt's 72-byte cutoff.
  if (Buffer.byteLength(pass, "utf8") > MAX_BCRYPT_BYTES) {
    return false;
  }
  return schema.validate(pass);
};

module.exports = validatePassword;
