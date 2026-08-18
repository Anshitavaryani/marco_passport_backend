'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Same goal as before: MySQL has no partial/filtered unique index
    // (unlike Postgres), so this composes a column that's unique among
    // active rows only, NULL for soft-deleted ones (deleted_at IS NOT
    // NULL, since users.model.js has paranoid:true) — MySQL allows any
    // number of NULLs in a unique index. This closes the registration
    // race condition where isEmailTaken() alone couldn't stop two
    // near-simultaneous requests for the same email both succeeding.
    //
    // REVISED APPROACH: originally this used a STORED generated column
    // (MySQL computing it automatically from email/role_id/deleted_at).
    // That hit a real MySQL/InnoDB limitation — adding a STORED
    // generated column always requires a full table rebuild
    // (ALGORITHM=COPY, documented MySQL behavior), and rebuilding a
    // table that has incoming foreign keys from other tables (users is
    // referenced by profiles, user_tokens, user_attachments,
    // user_login_timings, otps, payments) can throw a generic "#1215
    // Cannot add foreign key constraint" during that rebuild —
    // independent of FOREIGN_KEY_CHECKS, since it's a structural issue
    // in the rebuild, not a data-validation one.
    //
    // Switched to a plain (non-generated) column instead, maintained by
    // a beforeSave hook in user.model.js. Adding an ordinary column is
    // a fast, non-rebuilding operation in MySQL 8, sidestepping this
    // class of bug entirely.
    await queryInterface.addColumn('users', 'email_role_active_key', {
      type: Sequelize.STRING(210),
      allowNull: true,
    });

    // Backfill existing rows so the unique index below doesn't choke on
    // NULLs where a real key should exist (only genuinely soft-deleted
    // rows should end up NULL).
    await queryInterface.sequelize.query(`
      UPDATE users
      SET email_role_active_key = CASE
        WHEN deleted_at IS NULL THEN CONCAT(email, ':', role_id)
        ELSE NULL
      END;
    `);

    await queryInterface.addIndex('users', {
      fields: ['email_role_active_key'],
      unique: true,
      name: 'users_email_role_active_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('users', 'users_email_role_active_unique');
    await queryInterface.removeColumn('users', 'email_role_active_key');
  },
};