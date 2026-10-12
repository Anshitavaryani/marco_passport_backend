'use strict';

// "Passport" changed from one flat list of saved places per user (the
// `passports` table) to multiple itineraries (`itineraries` +
// `itinerary_items`, created by `npm run sync`). This copies each user's
// existing passport entries into one itinerary named "My Passport", in the
// order they were added.
//
// The old `passports` table is left in place; drop it once you've checked
// the copied data.
const tableNames = async (queryInterface) =>
  (await queryInterface.showAllTables()).map((table) =>
    typeof table === 'string' ? table : table.tableName
  );

module.exports = {
  async up(queryInterface) {
    const tables = await tableNames(queryInterface);
    if (!tables.includes('passports')) return;
    if (!tables.includes('itineraries') || !tables.includes('itinerary_items')) {
      throw new Error(
        'itineraries/itinerary_items tables are missing: run `npm run sync` before `npm run migrate`.'
      );
    }

    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        INSERT INTO itineraries (user_id, name, created_at, updated_at)
        SELECT p.user_id, 'My Passport', MIN(p.created_at), NOW()
        FROM passports p
        GROUP BY p.user_id;
        `,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `
        INSERT INTO itinerary_items
          (itinerary_id, place_id, position, visit_date, created_at, updated_at)
        SELECT
          i.id,
          p.place_id,
          ROW_NUMBER() OVER (PARTITION BY p.user_id ORDER BY p.created_at, p.id) - 1,
          p.visit_date,
          p.created_at,
          NOW()
        FROM passports p
        JOIN itineraries i ON i.user_id = p.user_id AND i.name = 'My Passport';
        `,
        { transaction }
      );
    });
  },

  async down() {
    // Not reversed automatically: by now users may have edited these
    // itineraries, and the original rows are still in `passports`.
  },
};
