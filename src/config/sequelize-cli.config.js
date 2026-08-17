// sequelize-cli needs its own config file (it doesn't know how to read
// src/config/config.js directly), but there's no reason to duplicate the
// DB credential logic — this just re-exports what's already validated
// there, so there's a single source of truth for connection settings
// whether the app or the CLI is the one connecting.
const config = require('./config');

const dbConfig = {
  username: config.databases.central.user,
  password: config.databases.central.passwd,
  database: config.databases.central.db,
  host: config.databases.central.host,
  port: config.databases.central.port,
  dialect: 'mysql',
};

module.exports = {
  development: dbConfig,
  test: dbConfig,
  production: dbConfig,
};
