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
        'manual_' || id, audit_id, NULL::integer,
        entity_type, entity_id,
        COALESCE(entity_type, 'General'),
        description, severity, 'manual'
      FROM concern_flags;
  `);
};
