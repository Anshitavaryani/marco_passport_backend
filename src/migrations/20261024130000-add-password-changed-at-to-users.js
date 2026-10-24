'use strict';

// When the user last changed or reset their password, so another change can
// wait 12 hours (auth.service.js). Nullable: existing users have no change
// on record, so nothing blocks them. Adding a nullable column is a fast,
// non-rebuilding operation in MySQL 8.
//
// Guarded: `npm run sync` creates this column from user.model.js, so on a
// fresh database it may already exist.
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('users');
    if (!columns.password_changed_at) {
      await queryInterface.addColumn('users', 'password_changed_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('users');
    if (columns.password_changed_at) {
      await queryInterface.removeColumn('users', 'password_changed_at');
    }
  },
};
