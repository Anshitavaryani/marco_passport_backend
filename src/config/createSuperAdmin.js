const { adminAuthService } = require("../services/Admin");
const config = require("../config/config");
const logger = require("../config/logger");
const sequelize = require("../config/central.db");

async function createSuperAdmin() {
  const {
    SUPER_ADMIN_NAME,
    SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_PASSWORD,
    SUP_ADM_ROLE_ID,
    ADM_DEPT_ID,
  } = config;

  if (
    !SUPER_ADMIN_NAME ||
    !SUPER_ADMIN_EMAIL ||
    !SUPER_ADMIN_PASSWORD ||
    !SUP_ADM_ROLE_ID ||
    !ADM_DEPT_ID
  ) {
    logger.error(
      "Cannot create super admin — missing one of SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUP_ADM_ROLE_ID, ADM_DEPT_ID in .env"
    );
    await sequelize.close();
    process.exit(1);
  }

  const adminObj = {
    name: SUPER_ADMIN_NAME,
    email: SUPER_ADMIN_EMAIL,
    password: SUPER_ADMIN_PASSWORD,
    role_id: SUP_ADM_ROLE_ID,
    department_id: ADM_DEPT_ID,
  };

  try {
    await adminAuthService.createAdminUser(adminObj);
    // Deliberately not logging the password here — it already lives in
    // your .env, and printing it to stdout means it ends up in
    // terminal scrollback, shell history, and any log aggregator
    // watching this process's output.
    logger.info(
      `Super admin created. Email: ${SUPER_ADMIN_EMAIL} (password is the one set in SUPER_ADMIN_PASSWORD in .env)`
    );
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error(`Super admin creation failed: ${error.message}`);
    await sequelize.close();
    process.exit(1);
  }
}

createSuperAdmin();
