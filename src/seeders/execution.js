/*
[NOTE] The cities*.sql dumps can be large, multi-thousand-row INSERT
statements. If seeding fails with a packet-size-related MySQL error,
the real fix is raising max_allowed_packet on the MySQL server itself —
this is a server config setting, not something fixable from this script:
    SHOW VARIABLES LIKE 'max_allowed_packet';
    -- then raise it in /etc/mysql/my.cnf (or equivalent) and restart MySQL.

*/

const fs = require("fs");
const path = require("path");
const logger = require("../config/logger");

const SEED_FILES = [
  "roles.sql",
  "departments.sql",
  "countries.sql",
  "states.sql",
  "cities.sql",
  "cities1.sql",
  "cities2.sql",
  "cities3.sql",
  "cities4.sql",
  "cities5.sql",
  "timezones.sql",
];

async function executeSQLDump(sequelize, transaction) {
  for (const fileName of SEED_FILES) {
    const sqlFilePath = path.join(__dirname, "dumps", fileName);
    const sql = fs.readFileSync(sqlFilePath, "utf-8");
    logger.info(`Seeding ${fileName}...`);
    await sequelize.query(sql, { transaction });
  }
}

module.exports = async function initialSeedData(sequelize) {
  // One transaction: the run either fully commits or fully rolls back.
  const transaction = await sequelize.transaction();
  try {
    await executeSQLDump(sequelize, transaction);
    await transaction.commit();
    logger.info("Data seeding completed.");
  } catch (error) {
    await transaction.rollback();
    logger.error(
      `Error while seeding initial data — rolled back: ${error.message}`
    );
    throw error;
  }
};
