const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { uploadsDir } = require('../middleware/upload');

const TABLE_COLUMNS = {
  internet_connections: [
    'isp', 'circuit_id', 'connection_type', 'presentation', 'download_mbps', 'upload_mbps',
    'ip_assignment', 'public_ip', 'router_model', 'contract_end_date', 'notes',
  ],
  networks: ['network', 'subnet', 'gateway', 'vlan', 'notes'],
  active_directory: [
    'domain_name', 'netbios_name', 'forest_functional_level', 'domain_functional_level',
    'domain_controller_count', 'fsmo_roles_holder', 'user_account_count', 'computer_account_count',
    'ad_recycle_bin_enabled', 'last_system_state_backup_date', 'notes',
  ],
  infrastructure_items: [
    'category', 'subtype', 'manufacturer', 'model', 'serial_number', 'firmware_version',
    'operating_system', 'form_factor', 'hostname', 'ip_address', 'location_description',
    'install_date', 'end_of_life_date', 'warranty_end_date', 'condition', 'details',
    'server_type', 'hypervisor_type', 'domain_joined', 'server_roles',
    'mac_address', 'managed_print_contract', 'asset_tag',
    'raid_level', 'total_capacity', 'drive_count', 'connection_type', 'notes',
    // host_infrastructure_item_id is deliberately excluded here - it's a self-reference to
    // another row in this same table, remapped in a second pass below once every
    // infrastructure_items row has its new id.
  ],
  comms_rooms: [
    'location', 'ups_present', 'ups_model', 'ups_battery_replace_date', 'cooling_type',
    'cooling_condition', 'cabling_condition', 'power_redundancy',
    'physical_security_description', 'notes',
  ],
  software: ['name', 'vendor', 'version', 'license_type', 'license_count', 'license_expiry_date', 'notes'],
  vendor_support: [
    'vendor_name', 'support_type', 'contact_name', 'contact_email', 'contact_phone',
    'contract_reference', 'contract_end_date', 'sla_notes',
  ],
};

const ENTITY_TYPE_TO_TABLE = {
  infrastructure_item: 'infrastructure_items',
  comms_room: 'comms_rooms',
  internet_connection: 'internet_connections',
  network: 'networks',
  active_directory: 'active_directory',
  software: 'software',
  vendor_support: 'vendor_support',
};

async function importAuditJson(pool, payload) {
  if (!payload || !payload.audit || !payload.customer) {
    const err = new Error('Invalid audit export file');
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const customerRes = await client.query(
      `INSERT INTO customers
         (name, primary_contact_name, primary_contact_email, primary_contact_phone, address, notes,
          address_line1, address_line2, town_city, county, postcode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        payload.customer.name,
        payload.customer.primary_contact_name,
        payload.customer.primary_contact_email,
        payload.customer.primary_contact_phone,
        payload.customer.address,
        payload.customer.notes,
        payload.customer.address_line1,
        payload.customer.address_line2,
        payload.customer.town_city,
        payload.customer.county,
        payload.customer.postcode,
      ]
    );
    const newCustomerId = customerRes.rows[0].id;

    const siteIdMap = new Map();
    for (const site of payload.sites || []) {
      const siteRes = await client.query(
        `INSERT INTO sites
           (customer_id, name, address, notes, contact_name, contact_email, contact_phone,
            address_line1, address_line2, town_city, county, postcode)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        [
          newCustomerId,
          site.name,
          site.address,
          site.notes,
          site.contact_name,
          site.contact_email,
          site.contact_phone,
          site.address_line1,
          site.address_line2,
          site.town_city,
          site.county,
          site.postcode,
        ]
      );
      siteIdMap.set(site.id, siteRes.rows[0].id);
    }

    const auditRes = await client.query(
      `INSERT INTO audits (customer_id, autotask_ticket_number, engineer_name, audit_date, status, summary_notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        newCustomerId,
        payload.audit.autotask_ticket_number,
        payload.audit.engineer_name,
        payload.audit.audit_date,
        payload.audit.status || 'completed',
        payload.audit.summary_notes,
      ]
    );
    const newAuditId = auditRes.rows[0].id;

    for (const newSiteId of siteIdMap.values()) {
      await client.query(
        'INSERT INTO audit_sites (audit_id, site_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [newAuditId, newSiteId]
      );
    }

    const entityIdMap = new Map(); // `${table}:${oldId}` -> newId, used to remap image/concern references

    for (const [table, columns] of Object.entries(TABLE_COLUMNS)) {
      for (const row of payload[table] || []) {
        const newSiteId = siteIdMap.get(row.site_id) || null;
        const values = [newAuditId, newSiteId, ...columns.map((c) => row[c])];
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const insertRes = await client.query(
          `INSERT INTO ${table} (audit_id, site_id, ${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`,
          values
        );
        entityIdMap.set(`${table}:${row.id}`, insertRes.rows[0].id);
      }
    }

    // Second pass: now that every infrastructure_items row has its new id, remap each
    // virtual machine's hypervisor host link (self-referential, so it can't be resolved
    // in the same pass that assigns new ids).
    for (const row of payload.infrastructure_items || []) {
      if (!row.host_infrastructure_item_id) continue;
      const newId = entityIdMap.get(`infrastructure_items:${row.id}`);
      const newHostId = entityIdMap.get(`infrastructure_items:${row.host_infrastructure_item_id}`);
      if (newId && newHostId) {
        await client.query('UPDATE infrastructure_items SET host_infrastructure_item_id = $1 WHERE id = $2', [
          newHostId,
          newId,
        ]);
      }
    }

    for (const flag of payload.concern_flags || []) {
      const table = ENTITY_TYPE_TO_TABLE[flag.entity_type];
      const remappedEntityId = table && entityIdMap.has(`${table}:${flag.entity_id}`)
        ? entityIdMap.get(`${table}:${flag.entity_id}`)
        : null;
      await client.query(
        `INSERT INTO concern_flags (audit_id, entity_type, entity_id, description, severity)
         VALUES ($1, $2, $3, $4, $5)`,
        [newAuditId, flag.entity_type, remappedEntityId, flag.description, flag.severity]
      );
    }

    for (const img of payload.images || []) {
      let newEntityId;
      if (img.entity_type === 'site') {
        newEntityId = siteIdMap.get(img.entity_id);
      } else if (img.entity_type === 'audit') {
        newEntityId = newAuditId;
      } else {
        const table = ENTITY_TYPE_TO_TABLE[img.entity_type];
        newEntityId = table ? entityIdMap.get(`${table}:${img.entity_id}`) : undefined;
      }
      if (newEntityId === undefined || newEntityId === null) continue;
      // Skip images whose source file couldn't be read at export time (data_base64 is null) -
      // inserting a DB row with no backing file would just be a permanently broken image link.
      if (!img.data_base64) continue;

      const filename = `${uuidv4()}${path.extname(img.original_filename || '') || '.jpg'}`;
      await fs.writeFile(path.join(uploadsDir, filename), Buffer.from(img.data_base64, 'base64'));
      await client.query(
        `INSERT INTO images (entity_type, entity_id, audit_id, file_path, original_filename, mime_type, file_size_bytes, caption)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [img.entity_type, newEntityId, newAuditId, filename, img.original_filename, img.mime_type, img.file_size_bytes, img.caption]
      );
    }

    await client.query('COMMIT');
    return { customer_id: newCustomerId, audit_id: newAuditId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { importAuditJson };
