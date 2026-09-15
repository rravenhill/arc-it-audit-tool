/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE infrastructure_items
      ADD COLUMN operating_system TEXT,
      ADD CONSTRAINT chk_operating_system_only_for_server CHECK (category = 'server' OR operating_system IS NULL);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE infrastructure_items
      DROP CONSTRAINT IF EXISTS chk_operating_system_only_for_server,
      DROP COLUMN IF EXISTS operating_system;
  `);
};
