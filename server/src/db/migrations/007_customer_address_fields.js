/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE customers
      ADD COLUMN address_line1 TEXT,
      ADD COLUMN address_line2 TEXT,
      ADD COLUMN town_city TEXT,
      ADD COLUMN county TEXT,
      ADD COLUMN postcode TEXT;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE customers
      DROP COLUMN IF EXISTS postcode,
      DROP COLUMN IF EXISTS county,
      DROP COLUMN IF EXISTS town_city,
      DROP COLUMN IF EXISTS address_line2,
      DROP COLUMN IF EXISTS address_line1;
  `);
};
