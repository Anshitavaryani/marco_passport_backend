// Thin CLI entrypoint for src/seeders/execution.js. Nothing else in the
// app calls execution.js directly — this file exists purely so
// `npm run seed` has something to invoke.
//
// Loads reference data (roles, departments, countries, states, cities,
// categories, timezones) from src/seeders/dumps/*.sql into the database.
// Run this AFTER `npm run sync` (tables must exist first) and typically
// after `npm run migrate` too. Without this, every FK-backed lookup
// (role_id, department_id, country_id, etc.) has nothing to reference —
// see the role_id / self-registration note in README.md.
const sequelize = require("../config/central.db");
const logger = require("../config/logger");
const initialSeedData = require("./execution");

initialSeedData(sequelize)
  .then(() => {
    logger.info("Seed run finished.");
    process.exit(0);
  })
  .catch((error) => {
    logger.error(`Seed run failed: ${error.message}`);
    process.exit(1);
  });