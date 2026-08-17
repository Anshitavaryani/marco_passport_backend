'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Same technique as the users migration, but scoped globally rather
    // than per-role — Admin.isEmailTaken(email) (admin.model.js) checks
    // email uniqueness across the whole admin hierarchy, not per role,
    // unlike User's per-role scoping. This matches that existing
    // application-level assumption at the DB level.
    await queryInterface.sequelize.query(`
      ALTER TABLE admins
      ADD COLUMN email_active_key VARCHAR(100)
        GENERATED ALWAYS AS (
          CASE WHEN deleted_at IS NULL THEN email ELSE NULL END
        ) STORED;
    `);

    await queryInterface.addIndex('admins', {
      fields: ['email_active_key'],
      unique: true,
      name: 'admins_email_active_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('admins', 'admins_email_active_unique');
    await queryInterface.sequelize.query(`
      ALTER TABLE admins DROP COLUMN email_active_key;
    `);
  },
};
