/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE infrastructure_items
      ADD COLUMN server_type TEXT CHECK (server_type IN ('physical', 'virtual', 'hypervisor')),
      ADD COLUMN hypervisor_type TEXT CHECK (hypervisor_type IN ('vmware', 'hyperv', 'other')),
      ADD COLUMN host_infrastructure_item_id INTEGER REFERENCES infrastructure_items(id) ON DELETE SET NULL,
      ADD COLUMN server_roles TEXT[] NOT NULL DEFAULT '{}',
      ADD CONSTRAINT chk_server_type_only_for_server CHECK (category = 'server' OR server_type IS NULL),
      ADD CONSTRAINT chk_hypervisor_type_only_for_hypervisor CHECK (server_type = 'hypervisor' OR hypervisor_type IS NULL),
      ADD CONSTRAINT chk_host_only_for_virtual CHECK (server_type = 'virtual' OR host_infrastructure_item_id IS NULL);

    CREATE INDEX idx_infra_host ON infrastructure_items(host_infrastructure_item_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_infra_host;
    ALTER TABLE infrastructure_items
      DROP CONSTRAINT IF EXISTS chk_host_only_for_virtual,
      DROP CONSTRAINT IF EXISTS chk_hypervisor_type_only_for_hypervisor,
      DROP CONSTRAINT IF EXISTS chk_server_type_only_for_server,
      DROP COLUMN IF EXISTS server_roles,
      DROP COLUMN IF EXISTS host_infrastructure_item_id,
      DROP COLUMN IF EXISTS hypervisor_type,
      DROP COLUMN IF EXISTS server_type;
  `);
};
