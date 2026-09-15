/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE active_directory (
      id SERIAL PRIMARY KEY,
      audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      site_id INTEGER NOT NULL REFERENCES sites(id),
      domain_name TEXT,
      netbios_name TEXT,
      forest_functional_level TEXT,
      domain_functional_level TEXT,
      domain_controller_count INTEGER,
      fsmo_roles_holder TEXT,
      user_account_count INTEGER,
      computer_account_count INTEGER,
      ad_recycle_bin_enabled BOOLEAN,
      last_system_state_backup_date DATE,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_active_directory_audit_id ON active_directory(audit_id);
    CREATE INDEX idx_active_directory_site_id ON active_directory(site_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS active_directory;
  `);
};
