const crypto = require("crypto");

const CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateRandomString(length = 32) {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("generateRandomString: length must be a positive integer");
  }

  let result = "";
  for (let i = 0; i < length; i++) {
    // crypto.randomInt avoids the modulo bias that
    // `crypto.randomBytes()[i] % charset.length` had here previously —
    // 256 (a byte's range) doesn't divide evenly by 62 (charset
    // length), so some characters came up very slightly more often
    // than others. Worth doing right since this generates
    // password-reset tokens.
    result += CHARSET[crypto.randomInt(0, CHARSET.length)];
  }
  return result;
}

module.exports = generateRandomString;
