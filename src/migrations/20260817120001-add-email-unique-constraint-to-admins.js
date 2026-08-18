'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Same technique and same revised approach as the users migration
    // (see its comments for the full MySQL rebuild/FK explanation) —
    // scoped globally rather than per-role, matching
    // Admin.isEmailTaken(email)'s existing application-level assumption
    // that admin email uniqueness applies across the whole admin
    // hierarchy, not per role.
    await queryInterface.addColumn('admins', 'email_active_key', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE admins
      SET email_active_key = CASE
        WHEN deleted_at IS NULL THEN email
        ELSE NULL
      END;
    `);

    await queryInterface.addIndex('admins', {
      fields: ['email_active_key'],
      unique: true,
      name: 'admins_email_active_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('admins', 'admins_email_active_unique');
    await queryInterface.removeColumn('admins', 'email_active_key');
  },
};