/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    DROP VIEW v_concerns;

    CREATE VIEW v_concerns AS
      SELECT
        'infra_eol_' || id AS concern_key, audit_id, site_id,
        'infrastructure_item' AS entity_type, id AS entity_id,
        NULLIF(concat_ws(' ', manufacturer, model), '') AS title,
        'End-of-life equipment (EOL ' || end_of_life_date || ')' AS description,
        'high' AS severity, 'end_of_life' AS category
      FROM infrastructure_items
      WHERE end_of_life_date IS NOT NULL AND end_of_life_date < CURRENT_DATE

      UNION ALL

      SELECT
        'infra_condition_' || id, audit_id, site_id,
        'infrastructure_item', id,
        NULLIF(concat_ws(' ', manufacturer, model), ''),
        'Equipment condition: ' || condition,
        CASE WHEN condition = 'faulted' THEN 'high' ELSE 'medium' END,
        'condition'
      FROM infrastructure_items
      WHERE condition IN ('poor', 'faulted')

      UNION ALL

      SELECT
        'infra_warranty_' || id, audit_id, site_id,
        'infrastructure_item', id,
        NULLIF(concat_ws(' ', manufacturer, model), ''),
        'Out of warranty (expired ' || warranty_end_date || ')',
        'low', 'warranty'
      FROM infrastructure_items
      WHERE warranty_end_date IS NOT NULL AND warranty_end_date < CURRENT_DATE

      UNION ALL

      -- Physical servers, hypervisors, and networking equipment installed more than
      -- 5 years ago - ageing hardware worth flagging even if not yet past its
      -- formal EOL/warranty dates. Virtual machines have no meaningful hardware
      -- age of their own, so they're excluded.
      SELECT
        'infra_aged_' || id, audit_id, site_id,
        'infrastructure_item', id,
        NULLIF(concat_ws(' ', manufacturer, model), ''),
        'Equipment over 5 years old (installed ' || install_date || ')',
        'medium', 'aged'
      FROM infrastructure_items
      WHERE install_date IS NOT NULL
        AND install_date < (CURRENT_DATE - INTERVAL '5 years')
        AND (
          category = 'networking'
          OR (category = 'server' AND server_type IN ('physical', 'hypervisor'))
        )

      UNION ALL

      SELECT
        'software_license_' || id, audit_id, site_id,
        'software', id, name,
        'Software license expired (' || license_expiry_date || ')',
        'medium', 'license'
      FROM software
      WHERE license_expiry_date IS NOT NULL AND license_expiry_date < CURRENT_DATE

      UNION ALL

      SELECT
        'vendor_contract_' || id, audit_id, site_id,
        'vendor_support', id, vendor_name,
        'Vendor support contract expired (' || contract_end_date || ')',
        'medium', 'contract'
      FROM vendor_support
      WHERE contract_end_date IS NOT NULL AND contract_end_date < CURRENT_DATE

      UNION ALL

      SELECT
        'connection_contract_' || id, audit_id, site_id,
        'internet_connection', id, isp,
        'Circuit contract expired (' || contract_end_date || ')',
        'low', 'contract'
      FROM internet_connections
      WHERE contract_end_date IS NOT NULL AND contract_end_date < CURRENT_DATE

      UNION ALL

      -- AD Recycle Bin not enabled - without it, accidentally deleted AD objects can't be
      -- restored without a full DC restore. Requires a domain name to be recorded too, same
      -- as the comms-room rules - a freshly-added, never-touched AD row shouldn't register
      -- as a finding just because its checkbox defaults to unchecked.
      SELECT
        'ad_recycle_bin_' || id, audit_id, site_id,
        'active_directory', id,
        NULLIF(domain_name, ''),
        'AD Recycle Bin is not enabled for this domain',
        'medium', 'ad_recycle_bin'
      FROM active_directory
      WHERE ad_recycle_bin_enabled IS NOT TRUE
        AND domain_name IS NOT NULL AND domain_name <> ''

      UNION ALL

      -- Only one Domain Controller recorded for this domain - no redundancy if it fails.
      SELECT
        'ad_single_dc_' || id, audit_id, site_id,
        'active_directory', id,
        NULLIF(domain_name, ''),
        'Only one Domain Controller for this domain - no redundancy if it fails',
        'medium', 'single_dc'
      FROM active_directory
      WHERE domain_controller_count = 1
        AND domain_name IS NOT NULL AND domain_name <> ''

      UNION ALL

      -- Comms room has no physical security control recorded (still "N/A"/blank).
      -- Requires a location to be recorded too - a freshly-added, never-touched room
      -- still carries the form's default "N/A" for this field, and without a location
      -- it isn't really a saved/documented room yet, just a placeholder row.
      SELECT
        'commsroom_physec_' || id, audit_id, site_id,
        'comms_room', id,
        NULLIF(location, ''),
        'No physical security control recorded for this comms room',
        'high', 'physical_security'
      FROM comms_rooms
      WHERE (physical_security_description IS NULL OR physical_security_description = 'N/A')
        AND location IS NOT NULL AND location <> ''

      UNION ALL

      -- Comms room has no UPS present.
      SELECT
        'commsroom_ups_' || id, audit_id, site_id,
        'comms_room', id,
        NULLIF(location, ''),
        'No UPS present in this comms room',
        'high', 'ups'
      FROM comms_rooms
      WHERE ups_present = false
        AND location IS NOT NULL AND location <> ''

      UNION ALL

      -- UPS battery replacement was already due as of the audit date.
      SELECT
        'commsroom_ups_battery_' || cr.id, cr.audit_id, cr.site_id,
        'comms_room', cr.id,
        NULLIF(cr.location, ''),
        'UPS battery replacement overdue (due ' || cr.ups_battery_replace_date || ')',
        'medium', 'ups_battery'
      FROM comms_rooms cr
      JOIN audits a ON a.id = cr.audit_id
      WHERE cr.ups_battery_replace_date IS NOT NULL
        AND a.audit_date IS NOT NULL
        AND cr.ups_battery_replace_date < a.audit_date
        AND cr.location IS NOT NULL AND cr.location <> ''

      UNION ALL

      -- Comms room cabling condition recorded as poor.
      SELECT
        'commsroom_cabling_' || id, audit_id, site_id,
        'comms_room', id,
        NULLIF(location, ''),
        'Cabling condition: poor',
        'medium', 'cabling'
      FROM comms_rooms
      WHERE cabling_condition = 'poor'
        AND location IS NOT NULL AND location <> ''

      UNION ALL

      SELECT
        'manual_' || id, audit_id, NULL::integer,
        entity_type, entity_id,
        COALESCE(entity_type, 'General'),
        description, severity, 'manual'
      FROM concern_flags;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP VIEW v_concerns;

    CREATE VIEW v_concerns AS
      SELECT
        'infra_eol_' || id AS concern_key, audit_id, site_id,
        'infrastructure_item' AS entity_type, id AS entity_id,
        NULLIF(concat_ws(' ', manufacturer, model), '') AS title,
        'End-of-life equipment (EOL ' || end_of_life_date || ')' AS description,
        'high' AS severity, 'end_of_life' AS category
      FROM infrastructure_items
      WHERE end_of_life_date IS NOT NULL AND end_of_life_date < CURRENT_DATE

      UNION ALL

      SELECT
        'infra_condition_' || id, audit_id, site_id,
        'infrastructure_item', id,
        NULLIF(concat_ws(' ', manufacturer, model), ''),
        'Equipment condition: ' || condition,
        CASE WHEN condition = 'faulted' THEN 'high' ELSE 'medium' END,
        'condition'
      FROM infrastructure_items
      WHERE condition IN ('poor', 'faulted')

      UNION ALL

      SELECT
        'infra_warranty_' || id, audit_id, site_id,
        'infrastructure_item', id,
        NULLIF(concat_ws(' ', manufacturer, model), ''),
        'Out of warranty (expired ' || warranty_end_date || ')',
        'low', 'warranty'
      FROM infrastructure_items
      WHERE warranty_end_date IS NOT NULL AND warranty_end_date < CURRENT_DATE

      UNION ALL

      SELECT
        'infra_aged_' || id, audit_id, site_id,
        'infrastructure_item', id,
        NULLIF(concat_ws(' ', manufacturer, model), ''),
        'Equipment over 5 years old (installed ' || install_date || ')',
        'medium', 'aged'
      FROM infrastructure_items
      WHERE install_date IS NOT NULL
        AND install_date < (CURRENT_DATE - INTERVAL '5 years')
        AND (
          category = 'networking'
          OR (category = 'server' AND server_type IN ('physical', 'hypervisor'))
        )

      UNION ALL

      SELECT
        'software_license_' || id, audit_id, site_id,
        'software', id, name,
        'Software license expired (' || license_expiry_date || ')',
        'medium', 'license'
      FROM software
      WHERE license_expiry_date IS NOT NULL AND license_expiry_date < CURRENT_DATE

      UNION ALL

      SELECT
        'vendor_contract_' || id, audit_id, site_id,
        'vendor_support', id, vendor_name,
        'Vendor support contract expired (' || contract_end_date || ')',
        'medium', 'contract'
      FROM vendor_support
      WHERE contract_end_date IS NOT NULL AND contract_end_date < CURRENT_DATE

      UNION ALL

      SELECT
        'connection_contract_' || id, audit_id, site_id,
        'internet_connection', id, isp,
        'Circuit contract expired (' || contract_end_date || ')',
        'low', 'contract'
      FROM internet_connections
      WHERE contract_end_date IS NOT NULL AND contract_end_date < CURRENT_DATE

      UNION ALL

      SELECT
        'ad_recycle_bin_' || id, audit_id, site_id,
        'active_directory', id,
        NULLIF(domain_name, ''),
        'AD Recycle Bin is not enabled for this domain',
        'medium', 'ad_recycle_bin'
      FROM active_directory
      WHERE ad_recycle_bin_enabled IS NOT TRUE
        AND domain_name IS NOT NULL AND domain_name <> ''

      UNION ALL

      SELECT
        'commsroom_physec_' || id, audit_id, site_id,
        'comms_room', id,
        NULLIF(location, ''),
        'No physical security control recorded for this comms room',
        'high', 'physical_security'
      FROM comms_rooms
      WHERE (physical_security_description IS NULL OR physical_security_description = 'N/A')
        AND location IS NOT NULL AND location <> ''

      UNION ALL

      SELECT
        'commsroom_ups_' || id, audit_id, site_id,
        'comms_room', id,
        NULLIF(location, ''),
        'No UPS present in this comms room',
        'high', 'ups'
      FROM comms_rooms
      WHERE ups_present = false
        AND location IS NOT NULL AND location <> ''

      UNION ALL

      SELECT
        'commsroom_ups_battery_' || cr.id, cr.audit_id, cr.site_id,
        'comms_room', cr.id,
        NULLIF(cr.location, ''),
        'UPS battery replacement overdue (due ' || cr.ups_battery_replace_date || ')',
        'medium', 'ups_battery'
      FROM comms_rooms cr
      JOIN audits a ON a.id = cr.audit_id
      WHERE cr.ups_battery_replace_date IS NOT NULL
        AND a.audit_date IS NOT NULL
        AND cr.ups_battery_replace_date < a.audit_date
        AND cr.location IS NOT NULL AND cr.location <> ''

      UNION ALL

      SELECT
        'commsroom_cabling_' || id, audit_id, site_id,
        'comms_room', id,
        NULLIF(location, ''),
        'Cabling condition: poor',
        'medium', 'cabling'
      FROM comms_rooms
      WHERE cabling_condition = 'poor'
        AND location IS NOT NULL AND location <> ''

      UNION ALL

      SELECT
        'manual_' || id, audit_id, NULL::integer,
        entity_type, entity_id,
        COALESCE(entity_type, 'General'),
        description, severity, 'manual'
      FROM concern_flags;
  `);
};
