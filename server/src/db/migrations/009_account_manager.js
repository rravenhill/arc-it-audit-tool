/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE customers
      ADD COLUMN account_manager_name TEXT,
      ADD COLUMN account_manager_email TEXT;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE customers
      DROP COLUMN IF EXISTS account_manager_email,
      DROP COLUMN IF EXISTS account_manager_name;
  `);
};
