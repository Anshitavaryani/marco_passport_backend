const config = require("../config/config");

// config.accessDomains is required in production (see config.js) but
// optional in dev/test, so this guards against a crash on module load
// (previously: a raw `.split()` on undefined) when it's unset locally.
// .trim() matters too — "a.com, b.com" (space after the comma, how most
// people write these) previously produced ' b.com' with a leading space,
// which silently never matches a real Origin header.
const allowedOrigins = (config.accessDomains || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = allowedOrigins;
