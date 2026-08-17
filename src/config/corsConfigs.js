const allowedOrigins = require("../helpers/accessDomains");

const corsConfigs = {
  origin: (origin, callback) => {
    // `!origin` allows requests with no Origin header — Postman, curl,
    // server-to-server calls, mobile apps. Remove that clause if you
    // need to block those too.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Origin not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = corsConfigs;
