'use strict';

// The beforeSave hooks that maintain users.email_role_active_key and
// admins.email_active_key used to write to attributes the models didn't
// define, so Sequelize never saved them: rows created after the original
// migrations have NULL keys and aren't covered by the unique indexes.
// The models now define the columns; this fills in the missing keys.
//
// If this fails with a duplicate-key error, two live accounts already share
// an email (+ role for users). Resolve those rows, then re-run.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE users
      SET email_role_active_key = CONCAT(email, ':', role_id)
      WHERE deleted_at IS NULL AND email_role_active_key IS NULL;
    `);
    await queryInterface.sequelize.query(`
      UPDATE admins
      SET email_active_key = email
      WHERE deleted_at IS NULL AND email_active_key IS NULL;
    `);
  },

  async down() {
    // Nothing to undo: the keys are derived data.
  },
};
