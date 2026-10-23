'use strict';

// Emails from the site's newsletter forms (footer and blog), kept until a
// mailing service is connected. One row per email.
//
// Guarded: `npm run sync` creates this table from
// newsletterSubscriber.model.js, so on a fresh database it may already exist.
const TABLE = 'newsletter_subscribers';
const EMAIL_INDEX = 'newsletter_subscribers_email_unique';

const tableNames = async (queryInterface) =>
  (await queryInterface.showAllTables()).map((table) =>
    typeof table === 'string' ? table : table.tableName
  );

module.exports = {
  async up(queryInterface, Sequelize) {
    if ((await tableNames(queryInterface)).includes(TABLE)) return;

    await queryInterface.createTable(TABLE, {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING(254),
        allowNull: false,
      },
      source: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex(TABLE, {
      fields: ['email'],
      unique: true,
      name: EMAIL_INDEX,
    });
  },

  async down(queryInterface) {
    if ((await tableNames(queryInterface)).includes(TABLE)) {
      await queryInterface.dropTable(TABLE);
    }
  },
};
