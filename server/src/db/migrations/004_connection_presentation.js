/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE internet_connections
      ADD COLUMN presentation TEXT;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE internet_connections
      DROP COLUMN IF EXISTS presentation;
  `);
};
