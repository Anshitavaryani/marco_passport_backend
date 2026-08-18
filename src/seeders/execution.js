/*
[NOTE] The cities*.sql dumps can be large, multi-thousand-row INSERT
statements. If seeding fails with a packet-size-related MySQL error,
the real fix is raising max_allowed_packet on the MySQL server itself —
this is a server config setting, not something fixable from this script:
    SHOW VARIABLES LIKE 'max_allowed_packet';
    -- then raise it in /etc/mysql/my.cnf (or equivalent) and restart MySQL.

A previous version of this file added an artificial 4-second delay
before each file via setTimeout, apparently as an attempted workaround
for exactly this — but a delay between sequential, already-awaited
queries does nothing to address a packet-size limit; it only made a
12-file seed run take 48+ seconds longer for no benefit. Removed.
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
  "categories.sql",
  "timezones.sql",
];

async function executeSQLDump(sequelize, transaction) {
  for (const fileName of SEED_FILES) {
    const sqlFilePath = path.join(__dirname, "dumps", fileName);
    const sql = fs.readFileSync(sqlFilePath, "utf-8");
    logger.info(`Seeding ${fileName}...`);
    // Was wrapped in `new Promise((resolve) => setTimeout(async () => {...}, 4000))`
    // with no `reject`, and the setTimeout callback's own rejection
    // (from a thrown sequelize.query()) was never observed by
    // anything. That meant a failure here — e.g. re-running against
    // an already-seeded table, which throws a duplicate primary key
    // error given these are plain INSERTs with hardcoded ids — left
    // the outer Promise permanently unsettled: the for loop hangs
    // forever awaiting it, with zero error output. A plain
    // sequential await, letting errors propagate to the transaction
    // wrapper below, is both simpler and actually correct.
    await sequelize.query(sql, { transaction });
  }
}

module.exports = async function initialSeedData(sequelize) {
  // Wrapped in a transaction so a failure partway through doesn't
  // leave the DB in a stuck, partially-seeded state that can't be
  // cleanly retried (see the file-level note above) — this run either
  // fully commits or fully rolls back.
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
    // Was: caught, logged, then a bare `return` — meaning this
    // function's promise resolved successfully even when seeding
    // had actually failed, giving any future caller no way to know
    // something went wrong. Re-throwing so failures are visible.
    throw error;
  }
};
