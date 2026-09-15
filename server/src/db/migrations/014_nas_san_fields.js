/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE infrastructure_items
      DROP CONSTRAINT infrastructure_items_category_check,
      ADD CONSTRAINT infrastructure_items_category_check
        CHECK (category IN ('networking', 'printer', 'server', 'nas', 'san', 'other')),
      ADD COLUMN raid_level TEXT,
      ADD COLUMN total_capacity TEXT,
      ADD COLUMN drive_count INTEGER,
      ADD COLUMN connection_type TEXT,
      ADD CONSTRAINT chk_raid_level_only_for_storage CHECK (category IN ('nas', 'san') OR raid_level IS NULL),
      ADD CONSTRAINT chk_total_capacity_only_for_storage CHECK (category IN ('nas', 'san') OR total_capacity IS NULL),
      ADD CONSTRAINT chk_drive_count_only_for_storage CHECK (category IN ('nas', 'san') OR drive_count IS NULL),
      ADD CONSTRAINT chk_connection_type_only_for_storage CHECK (category IN ('nas', 'san') OR connection_type IS NULL);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE infrastructure_items
      DROP CONSTRAINT IF EXISTS chk_connection_type_only_for_storage,
      DROP CONSTRAINT IF EXISTS chk_drive_count_only_for_storage,
      DROP CONSTRAINT IF EXISTS chk_total_capacity_only_for_storage,
      DROP CONSTRAINT IF EXISTS chk_raid_level_only_for_storage,
      DROP COLUMN IF EXISTS connection_type,
      DROP COLUMN IF EXISTS drive_count,
      DROP COLUMN IF EXISTS total_capacity,
      DROP COLUMN IF EXISTS raid_level,
      DROP CONSTRAINT infrastructure_items_category_check,
      ADD CONSTRAINT infrastructure_items_category_check
        CHECK (category IN ('networking', 'printer', 'server', 'other'));
  `);
};
