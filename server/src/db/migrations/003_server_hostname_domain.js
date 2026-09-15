/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE infrastructure_items
      ADD COLUMN hostname TEXT,
      ADD COLUMN domain_joined BOOLEAN,
      ADD CONSTRAINT chk_hostname_only_for_server CHECK (category = 'server' OR hostname IS NULL),
      ADD CONSTRAINT chk_domain_joined_only_for_server CHECK (category = 'server' OR domain_joined IS NULL);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE infrastructure_items
      DROP CONSTRAINT IF EXISTS chk_domain_joined_only_for_server,
      DROP CONSTRAINT IF EXISTS chk_hostname_only_for_server,
      DROP COLUMN IF EXISTS domain_joined,
      DROP COLUMN IF EXISTS hostname;
  `);
};
