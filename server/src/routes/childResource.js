const express = require('express');
const pool = require('../db/pool');

/**
 * Factory for the CRUD shape shared by every audit-scoped child table
 * (internet_connections, infrastructure_items, comms_rooms, software, vendor_support).
 * `columns` is a fixed whitelist defined per route file, never derived from request input.
 */
function createChildRouter({ table, columns }) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const { audit_id } = req.query;
      if (!audit_id) return res.status(400).json({ error: 'audit_id query param is required' });
      const { rows } = await pool.query(`SELECT * FROM ${table} WHERE audit_id = $1 ORDER BY id`, [audit_id]);
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const { audit_id, site_id } = req.body;
      if (!audit_id || !site_id) {
        return res.status(400).json({ error: 'audit_id and site_id are required' });
      }
      const extraCols = columns.filter((c) => req.body[c] !== undefined);
      const cols = ['audit_id', 'site_id', ...extraCols];
      const values = [audit_id, site_id, ...extraCols.map((c) => req.body[c])];
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await pool.query(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const updateColumns = columns.filter((c) => req.body[c] !== undefined);
      if (!updateColumns.length) return res.status(400).json({ error: 'No fields to update' });
      const values = updateColumns.map((c) => req.body[c]);
      const setClauses = updateColumns.map((c, i) => `${c} = $${i + 1}`);
      setClauses.push('updated_at = now()');
      values.push(req.params.id);
      const { rows } = await pool.query(
        `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (!rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createChildRouter;
