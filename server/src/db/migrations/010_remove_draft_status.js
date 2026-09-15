/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    UPDATE audits SET status = 'in_progress' WHERE status = 'draft';

    ALTER TABLE audits
      ALTER COLUMN status SET DEFAULT 'in_progress',
      DROP CONSTRAINT audits_status_check,
      ADD CONSTRAINT audits_status_check CHECK (status IN ('in_progress', 'completed'));
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE audits
      ALTER COLUMN status SET DEFAULT 'draft',
      DROP CONSTRAINT audits_status_check,
      ADD CONSTRAINT audits_status_check CHECK (status IN ('draft', 'in_progress', 'completed'));
  `);
};
