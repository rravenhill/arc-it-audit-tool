/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE infrastructure_items
      ADD COLUMN form_factor TEXT,
      ADD CONSTRAINT chk_form_factor_only_for_server CHECK (category = 'server' OR form_factor IS NULL);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE infrastructure_items
      DROP CONSTRAINT IF EXISTS chk_form_factor_only_for_server,
      DROP COLUMN IF EXISTS form_factor;
  `);
};
