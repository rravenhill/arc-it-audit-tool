/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE infrastructure_items
      ADD COLUMN mac_address TEXT,
      ADD COLUMN managed_print_contract BOOLEAN,
      ADD COLUMN asset_tag TEXT,
      ADD CONSTRAINT chk_mac_address_only_for_printer CHECK (category = 'printer' OR mac_address IS NULL),
      ADD CONSTRAINT chk_managed_print_contract_only_for_printer CHECK (category = 'printer' OR managed_print_contract IS NULL),
      ADD CONSTRAINT chk_asset_tag_only_for_printer CHECK (category = 'printer' OR asset_tag IS NULL);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE infrastructure_items
      DROP CONSTRAINT IF EXISTS chk_asset_tag_only_for_printer,
      DROP CONSTRAINT IF EXISTS chk_managed_print_contract_only_for_printer,
      DROP CONSTRAINT IF EXISTS chk_mac_address_only_for_printer,
      DROP COLUMN IF EXISTS asset_tag,
      DROP COLUMN IF EXISTS managed_print_contract,
      DROP COLUMN IF EXISTS mac_address;
  `);
};
