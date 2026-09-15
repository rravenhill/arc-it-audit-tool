/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE networks (
      id SERIAL PRIMARY KEY,
      audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      site_id INTEGER NOT NULL REFERENCES sites(id),
      subnet TEXT,
      gateway TEXT,
      vlan TEXT,
      purpose TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_networks_audit_id ON networks(audit_id);
    CREATE INDEX idx_networks_site_id ON networks(site_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS networks;
  `);
};
