const { Sequelize } = require("sequelize");
const config = require("./config.js");
const logger = require("./logger.js");

const sequelizeOptions = {
  host: config.databases.central.host,
  port: config.databases.central.port, // was missing — silently fell back to MySQL's default 3306
  dialect: "mysql",
  supportBigNumbers: true,
  collate: "utf8mb4_unicode_ci",
  timezone: "+00:00", // store/convert dates in UTC regardless of server TZ
  dialectOptions: {
    charset: "utf8mb4",
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
    evict: 15000,
  },
  logging: config.env === "production" ? false : (msg) => logger.debug(msg),
};

const sequelize = new Sequelize(
  config.databases.central.db,
  config.databases.central.user,
  config.databases.central.passwd,
  sequelizeOptions
);

// The primary DB is not optional — nothing in this app works without it.
// Retry a few times (handles the common case of the app container starting
// slightly before the DB is ready to accept connections), then fail fast
// rather than silently serving traffic against a dead DB connection.
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 3000;

const connectWithRetry = async (attempt = 1) => {
  try {
    await sequelize.authenticate();
    logger.info("Primary database connection established.");
  } catch (error) {
    logger.warn(
      `Database connection attempt ${attempt}/${MAX_ATTEMPTS} failed: ${error.message}`
    );
    if (attempt >= MAX_ATTEMPTS) {
      logger.error("Could not connect to the primary database. Exiting.");
      process.exit(1);
    }
    setTimeout(() => connectWithRetry(attempt + 1), RETRY_DELAY_MS);
  }
};

connectWithRetry();

module.exports = sequelize;
