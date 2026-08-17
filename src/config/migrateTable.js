const sequelize = require("./central.db");
const config = require("./config");
const logger = require("./logger");
require("../models");

// `sync({ alter: true })` inspects your live schema and mutates it to match
// your models — it can drop columns or otherwise lose data with no review,
// versioning, or rollback. That's fine for a local/dev database, but it is
// not a safe production migration strategy. For a real production deploy,
// use sequelize-cli migrations (versioned, reviewable `up`/`down` files)
// instead of running this script against prod.
//
// This guard exists so `npm run sync` can't accidentally alter a
// production database without a deliberate override. Real production
// schema changes now go through `npm run migrate` (sequelize-cli,
// versioned migrations in src/migrations/) instead.
const init = async () => {
  if (config.env === "production" && process.env.ALLOW_PROD_SYNC !== "true") {
    logger.error(
      "Refusing to run sync({ alter: true }) against production. " +
        "Use sequelize-cli migrations for prod schema changes, or set ALLOW_PROD_SYNC=true if you really mean this."
    );
    process.exit(1);
  }

  try {
    await sequelize.sync({ alter: true });
    logger.info("Table alteration completed.");
    // To seed initial data after altering, uncomment:
    // const initialSeedData = require('../seeders/execution');
    // await initialSeedData(sequelize);
    process.exit(0);
  } catch (error) {
    logger.error(`Failed to alter tables: ${error.message}`);
    process.exit(1);
  }
};

init();
