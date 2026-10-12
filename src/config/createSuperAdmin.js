const { adminAuthService } = require("../services/Admin");
const config = require("../config/config");
const logger = require("../config/logger");
const sequelize = require("../config/central.db");

async function createSuperAdmin() {
  const {
    SUPER_ADMIN_NAME,
    SUPER_ADMIN_EMAIL,
    SUP_ADM_ROLE_ID,
    ADM_DEPT_ID,
  } = config;

  if (
    !SUPER_ADMIN_NAME ||
    !SUPER_ADMIN_EMAIL ||
    !SUP_ADM_ROLE_ID ||
    !ADM_DEPT_ID
  ) {
    logger.error(
      "Cannot create super admin — missing one of SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUP_ADM_ROLE_ID, ADM_DEPT_ID in .env"
    );
    await sequelize.close();
    process.exit(1);
  }

  const adminObj = {
    name: SUPER_ADMIN_NAME,
    email: SUPER_ADMIN_EMAIL,
    role_id: SUP_ADM_ROLE_ID,
    department_id: ADM_DEPT_ID,
  };

  try {
    await adminAuthService.createAdminUser(adminObj);
    // createAdminUser generates a temporary password and emails it.
    logger.info(
      `Super admin created. Temporary password emailed to ${SUPER_ADMIN_EMAIL}.`
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
