'use strict';

// Magazine issues from the admin's magazine builder. Each issue keeps its
// pages as one JSON document; slug_active (the slug while the issue isn't
// deleted) keeps addresses unique among live issues.
//
// Guarded: `npm run sync` creates this table from magazine.model.js, so on a
// fresh database it may already exist.
const TABLE = 'magazines';
const SLUG_INDEX = 'magazines_slug_active_unique';
const LIST_INDEX = 'magazines_status_publish_date';

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
      title: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING(160),
        allowNull: false,
      },
      slug_active: {
        type: Sequelize.STRING(160),
        allowNull: true,
      },
      issue_label: {
        type: Sequelize.STRING(60),
        allowNull: true,
      },
      season: {
        type: Sequelize.STRING(60),
        allowNull: true,
      },
      publish_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      masthead: {
        type: Sequelize.STRING(40),
        allowNull: true,
      },
      tagline: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('draft', 'published'),
        allowNull: false,
        defaultValue: 'draft',
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      cover_image: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      pages: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      page_count: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      version: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex(TABLE, {
      fields: ['slug_active'],
      unique: true,
      name: SLUG_INDEX,
    });
    await queryInterface.addIndex(TABLE, {
      fields: ['status', 'publish_date'],
      name: LIST_INDEX,
    });
  },

  async down(queryInterface) {
    if ((await tableNames(queryInterface)).includes(TABLE)) {
      await queryInterface.dropTable(TABLE);
    }
  },
};
