const config = require("../config/config");

// Optional outside production; entries are trimmed so "a.com, b.com" works.
const allowedOrigins = (config.accessDomains || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = allowedOrigins;
