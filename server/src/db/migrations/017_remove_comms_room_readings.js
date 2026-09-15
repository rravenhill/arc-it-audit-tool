/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE comms_rooms
      DROP COLUMN temperature_reading,
      DROP COLUMN humidity_reading;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE comms_rooms
      ADD COLUMN temperature_reading NUMERIC,
      ADD COLUMN humidity_reading NUMERIC;
  `);
};
