'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // MySQL has no partial/filtered unique index (unlike Postgres), so
    // this uses the standard MySQL workaround: a stored generated column
    // that evaluates to NULL for soft-deleted rows (deleted_at IS NOT NULL,
    // since users.model.js has paranoid:true), with the unique index on
    // that generated column rather than on (email, role_id) directly.
    // MySQL allows any number of NULLs in a unique index, so soft-deleted
    // rows never collide with each other or with an active row that
    // later reuses the same email/role_id — closing the registration
    // race condition where isEmailTaken() alone couldn't stop two
    // near-simultaneous requests for the same email both succeeding.
    await queryInterface.sequelize.query(`
      ALTER TABLE users
      ADD COLUMN email_role_active_key VARCHAR(210)
        GENERATED ALWAYS AS (
          CASE WHEN deleted_at IS NULL THEN CONCAT(email, ':', role_id) ELSE NULL END
        ) STORED;
    `);

    await queryInterface.addIndex('users', {
      fields: ['email_role_active_key'],
      unique: true,
      name: 'users_email_role_active_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('users', 'users_email_role_active_unique');
    await queryInterface.sequelize.query(`
      ALTER TABLE users DROP COLUMN email_role_active_key;
    `);
  },
};
