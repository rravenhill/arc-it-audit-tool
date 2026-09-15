/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE networks
      ADD COLUMN network TEXT;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE networks
      DROP COLUMN network;
  `);
};
