const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const pool = require('../db/pool');
const { uploadsDir } = require('../middleware/upload');
const { composeAddress } = require('../utils/composeAddress');

const router = express.Router();

const SITE_SCOPED_TABLES = ['internet_connections', 'infrastructure_items', 'comms_rooms', 'software', 'vendor_support'];

router.get('/', async (req, res, next) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) return res.status(400).json({ error: 'customer_id query param is required' });
    const { rows } = await pool.query(
      `SELECT s.*, active.id AS active_audit_id
       FROM sites s
       LEFT JOIN LATERAL (
         SELECT a.id FROM audit_sites asx
         JOIN audits a ON a.id = asx.audit_id
         WHERE asx.site_id = s.id AND a.status = 'in_progress'
         LIMIT 1
       ) active ON true
       WHERE s.customer_id = $1
       ORDER BY s.name`,
      [customer_id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sites WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { customer_id, name, notes, contact_name, contact_email, contact_phone } = req.body;
    const { address_line1, address_line2, town_city, county, postcode } = req.body;
    if (!customer_id || !name) return res.status(400).json({ error: 'customer_id and name are required' });
    const address = composeAddress({ address_line1, address_line2, town_city, county, postcode });
    const { rows } = await pool.query(
      `INSERT INTO sites
         (customer_id, name, notes, contact_name, contact_email, contact_phone,
          address_line1, address_line2, town_city, county, postcode, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        customer_id,
        name,
        notes,
        contact_name,
        contact_email,
        contact_phone,
        address_line1,
        address_line2,
        town_city,
        county,
        postcode,
        address,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

const UPDATABLE_COLUMNS = [
  'name',
  'notes',
  'contact_name',
  'contact_email',
  'contact_phone',
  'address_line1',
  'address_line2',
  'town_city',
  'county',
  'postcode',
];
const ADDRESS_PART_COLUMNS = ['address_line1', 'address_line2', 'town_city', 'county', 'postcode'];

router.put('/:id', async (req, res, next) => {
  try {
    const updateColumns = UPDATABLE_COLUMNS.filter((c) => req.body[c] !== undefined);
    if (!updateColumns.length) return res.status(400).json({ error: 'No fields to update' });

    // If any structured address part is being updated, recompose the flat `address` summary
    // from the full current row so it never drifts out of sync with unchanged fields.
    let addressUpdate = [];
    if (ADDRESS_PART_COLUMNS.some((c) => updateColumns.includes(c))) {
      const { rows: existingRows } = await pool.query('SELECT * FROM sites WHERE id = $1', [req.params.id]);
      if (!existingRows[0]) return res.status(404).json({ error: 'Not found' });
      const merged = { ...existingRows[0], ...req.body };
      addressUpdate = ['address'];
      req.body.address = composeAddress(merged);
    }

    const allUpdateColumns = [...updateColumns, ...addressUpdate];
    const values = allUpdateColumns.map((c) => req.body[c]);
    const setClauses = allUpdateColumns.map((c, i) => `${c} = $${i + 1}`);
    setClauses.push('updated_at = now()');
    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE sites SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Grab site-level photo file paths before the rows disappear, so they can be cleaned
    // up off disk once the transaction commits.
    const siteImagesRes = await client.query(
      `SELECT file_path FROM images WHERE entity_type = 'site' AND entity_id = $1`,
      [req.params.id]
    );

    // Audits linked to this site - captured before the audit_sites link is removed below,
    // so any that end up covering zero sites can be identified as orphans afterwards.
    const linkedAuditsRes = await client.query('SELECT audit_id FROM audit_sites WHERE site_id = $1', [req.params.id]);
    const linkedAuditIds = linkedAuditsRes.rows.map((r) => r.audit_id);

    // site_id has no ON DELETE CASCADE on these tables (see migration 002) - that's
    // deliberate everywhere else, so a stray site deletion never silently wipes another
    // audit's history. Deleting a site outright is a real "remove this site and everything
    // recorded against it" action, so do that cleanup explicitly here instead. This only
    // affects audits that still cover another site - ones left covering none are removed
    // entirely below.
    for (const table of SITE_SCOPED_TABLES) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(`DELETE FROM ${table} WHERE site_id = $1`, [req.params.id]);
    }
    await client.query('DELETE FROM audit_sites WHERE site_id = $1', [req.params.id]);

    // An audit that only ever covered this site is now an orphan with nothing to belong
    // to - cascade-delete it too (audits(id) FKs are ON DELETE CASCADE, so this also cleans
    // up its remaining child rows, concern flags, and audit-scoped images in one go).
    let orphanAuditImagesRes = { rows: [] };
    if (linkedAuditIds.length) {
      const orphansRes = await client.query(
        `SELECT id FROM audits WHERE id = ANY($1::int[])
           AND NOT EXISTS (SELECT 1 FROM audit_sites WHERE audit_id = audits.id)`,
        [linkedAuditIds]
      );
      const orphanIds = orphansRes.rows.map((r) => r.id);
      if (orphanIds.length) {
        orphanAuditImagesRes = await client.query('SELECT file_path FROM images WHERE audit_id = ANY($1::int[])', [
          orphanIds,
        ]);
        await client.query('DELETE FROM audits WHERE id = ANY($1::int[])', [orphanIds]);
      }
    }

    await client.query(`DELETE FROM images WHERE entity_type = 'site' AND entity_id = $1`, [req.params.id]);
    const { rowCount } = await client.query('DELETE FROM sites WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');

    if (!rowCount) return res.status(404).json({ error: 'Not found' });

    const allImageRows = [...siteImagesRes.rows, ...orphanAuditImagesRes.rows];
    await Promise.all(allImageRows.map((r) => fs.unlink(path.join(uploadsDir, r.file_path)).catch(() => {})));
    res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
