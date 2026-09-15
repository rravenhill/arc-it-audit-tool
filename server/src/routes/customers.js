const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const pool = require('../db/pool');
const { uploadsDir } = require('../middleware/upload');
const { composeAddress } = require('../utils/composeAddress');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    const { rows } = search
      ? await pool.query('SELECT * FROM customers WHERE name ILIKE $1 ORDER BY name', [`%${search}%`])
      : await pool.query('SELECT * FROM customers ORDER BY name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, primary_contact_name, primary_contact_email, primary_contact_phone, notes } = req.body;
    const { address_line1, address_line2, town_city, county, postcode } = req.body;
    const { account_manager_name, account_manager_email } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const address = composeAddress({ address_line1, address_line2, town_city, county, postcode });
    const { rows } = await pool.query(
      `INSERT INTO customers
         (name, primary_contact_name, primary_contact_email, primary_contact_phone, notes,
          address_line1, address_line2, town_city, county, postcode, address,
          account_manager_name, account_manager_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        name,
        primary_contact_name,
        primary_contact_email,
        primary_contact_phone,
        notes,
        address_line1,
        address_line2,
        town_city,
        county,
        postcode,
        address,
        account_manager_name,
        account_manager_email,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

const UPDATABLE_COLUMNS = [
  'name',
  'primary_contact_name',
  'primary_contact_email',
  'primary_contact_phone',
  'notes',
  'address_line1',
  'address_line2',
  'town_city',
  'county',
  'postcode',
  'account_manager_name',
  'account_manager_email',
];
const ADDRESS_PART_COLUMNS = ['address_line1', 'address_line2', 'town_city', 'county', 'postcode'];

router.put('/:id', async (req, res, next) => {
  try {
    const updateColumns = UPDATABLE_COLUMNS.filter((c) => req.body[c] !== undefined);
    if (!updateColumns.length) return res.status(400).json({ error: 'No fields to update' });

    // If any structured address part is being updated, recompose the flat `address` summary
    // from the full current row (not just the parts sent in this request) so it never drifts
    // out of sync with whichever fields didn't change.
    let addressUpdate = [];
    if (ADDRESS_PART_COLUMNS.some((c) => updateColumns.includes(c))) {
      const { rows: existingRows } = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
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
      `UPDATE customers SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
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

    // Grab every image file this customer's audits reference before the rows disappear,
    // so we can clean them up off disk once the transaction commits.
    const imagesRes = await client.query(
      `SELECT i.file_path FROM images i JOIN audits a ON a.id = i.audit_id WHERE a.customer_id = $1`,
      [req.params.id]
    );

    // Deleting audits first cascades away every audit-scoped child row (connections,
    // infrastructure, comms rooms, software, vendor support, images, concerns, audit_sites).
    // Only then can sites be deleted - they're otherwise protected from removal while any
    // audit data still points at them (see migration 002), and relying on multi-path
    // cascade ordering from customers -> {audits, sites} directly isn't guaranteed.
    await client.query('DELETE FROM audits WHERE customer_id = $1', [req.params.id]);
    await client.query('DELETE FROM sites WHERE customer_id = $1', [req.params.id]);
    const { rowCount } = await client.query('DELETE FROM customers WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');

    if (!rowCount) return res.status(404).json({ error: 'Not found' });

    await Promise.all(imagesRes.rows.map((r) => fs.unlink(path.join(uploadsDir, r.file_path)).catch(() => {})));
    res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
