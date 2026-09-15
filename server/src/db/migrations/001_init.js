/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      primary_contact_name TEXT,
      primary_contact_email TEXT,
      primary_contact_phone TEXT,
      address TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE sites (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      address TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_sites_customer_id ON sites(customer_id);

    CREATE TABLE audits (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      autotask_ticket_number TEXT,
      engineer_name TEXT,
      audit_date DATE,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
      summary_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_audits_customer_id ON audits(customer_id);
    CREATE INDEX idx_audits_ticket ON audits(autotask_ticket_number);

    CREATE TABLE audit_sites (
      id SERIAL PRIMARY KEY,
      audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      site_id INTEGER NOT NULL REFERENCES sites(id),
      UNIQUE (audit_id, site_id)
    );
    CREATE INDEX idx_audit_sites_audit_id ON audit_sites(audit_id);

    CREATE TABLE internet_connections (
      id SERIAL PRIMARY KEY,
      audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      site_id INTEGER NOT NULL REFERENCES sites(id),
      isp TEXT,
      circuit_id TEXT,
      connection_type TEXT,
      download_mbps NUMERIC,
      upload_mbps NUMERIC,
      ip_assignment TEXT CHECK (ip_assignment IN ('static', 'dynamic')),
      public_ip TEXT,
      router_model TEXT,
      contract_end_date DATE,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_connections_audit_id ON internet_connections(audit_id);
    CREATE INDEX idx_connections_site_id ON internet_connections(site_id);

    CREATE TABLE infrastructure_items (
      id SERIAL PRIMARY KEY,
      audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      site_id INTEGER NOT NULL REFERENCES sites(id),
      category TEXT NOT NULL CHECK (category IN ('networking', 'printer', 'server', 'other')),
      subtype TEXT,
      manufacturer TEXT,
      model TEXT,
      serial_number TEXT,
      firmware_version TEXT,
      ip_address TEXT,
      location_description TEXT,
      install_date DATE,
      end_of_life_date DATE,
      warranty_end_date DATE,
      condition TEXT CHECK (condition IN ('good', 'fair', 'poor', 'faulted')),
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_infra_audit_id ON infrastructure_items(audit_id);
    CREATE INDEX idx_infra_site_id ON infrastructure_items(site_id);

    CREATE TABLE comms_rooms (
      id SERIAL PRIMARY KEY,
      audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      site_id INTEGER NOT NULL REFERENCES sites(id),
      location TEXT,
      ups_present BOOLEAN,
      ups_model TEXT,
      ups_battery_replace_date DATE,
      cooling_type TEXT,
      cooling_condition TEXT,
      cabling_condition TEXT CHECK (cabling_condition IN ('good', 'fair', 'poor')),
      power_redundancy TEXT,
      physical_security_description TEXT,
      temperature_reading NUMERIC,
      humidity_reading NUMERIC,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_comms_rooms_audit_id ON comms_rooms(audit_id);
    CREATE INDEX idx_comms_rooms_site_id ON comms_rooms(site_id);

    CREATE TABLE software (
      id SERIAL PRIMARY KEY,
      audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      site_id INTEGER NOT NULL REFERENCES sites(id),
      name TEXT NOT NULL,
      vendor TEXT,
      version TEXT,
      license_type TEXT,
      license_count INTEGER,
      license_expiry_date DATE,
      eol_date DATE,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_software_audit_id ON software(audit_id);
    CREATE INDEX idx_software_site_id ON software(site_id);

    CREATE TABLE vendor_support (
      id SERIAL PRIMARY KEY,
      audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      site_id INTEGER NOT NULL REFERENCES sites(id),
      vendor_name TEXT NOT NULL,
      support_type TEXT,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      contract_reference TEXT,
      contract_end_date DATE,
      sla_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_vendor_support_audit_id ON vendor_support(audit_id);
    CREATE INDEX idx_vendor_support_site_id ON vendor_support(site_id);

    CREATE TABLE images (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL CHECK (entity_type IN ('infrastructure_item', 'comms_room', 'internet_connection', 'site', 'audit')),
      entity_id INTEGER NOT NULL,
      audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      original_filename TEXT,
      mime_type TEXT,
      file_size_bytes INTEGER,
      caption TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_images_audit_id ON images(audit_id);
    CREATE INDEX idx_images_entity ON images(entity_type, entity_id);

    CREATE TABLE concern_flags (
      id SERIAL PRIMARY KEY,
      audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      entity_type TEXT,
      entity_id INTEGER,
      description TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_concern_flags_audit_id ON concern_flags(audit_id);

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
        'software_eol_' || id, audit_id, site_id,
        'software', id, name,
        'Software past end-of-life (EOL ' || eol_date || ')',
        'high', 'end_of_life'
      FROM software
      WHERE eol_date IS NOT NULL AND eol_date < CURRENT_DATE

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
    DROP VIEW IF EXISTS v_concerns;
    DROP TABLE IF EXISTS concern_flags;
    DROP TABLE IF EXISTS images;
    DROP TABLE IF EXISTS vendor_support;
    DROP TABLE IF EXISTS software;
    DROP TABLE IF EXISTS comms_rooms;
    DROP TABLE IF EXISTS infrastructure_items;
    DROP TABLE IF EXISTS internet_connections;
    DROP TABLE IF EXISTS audit_sites;
    DROP TABLE IF EXISTS audits;
    DROP TABLE IF EXISTS sites;
    DROP TABLE IF EXISTS customers;
  `);
};
