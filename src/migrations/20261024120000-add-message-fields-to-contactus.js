'use strict';

// The public contact form now saves the sender's name, a subject and the
// message alongside their email. All three are nullable: rows saved before
// the form was wired don't have them.
//
// Guarded: `npm run sync` creates these columns from contactUs.model.js, so
// on a fresh database they may already exist.
const TABLE = 'contactus';

const newColumns = (Sequelize) => ({
  name: { type: Sequelize.STRING(150), allowNull: true },
  subject: { type: Sequelize.STRING(200), allowNull: true },
  message: { type: Sequelize.TEXT, allowNull: true },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.describeTable(TABLE);
    for (const [column, definition] of Object.entries(newColumns(Sequelize))) {
      if (!existing[column]) {
        await queryInterface.addColumn(TABLE, column, definition);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const existing = await queryInterface.describeTable(TABLE);
    for (const column of Object.keys(newColumns(Sequelize))) {
      if (existing[column]) {
        await queryInterface.removeColumn(TABLE, column);
      }
    }
  },
};
