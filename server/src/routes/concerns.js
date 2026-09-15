const express = require('express');
const pool = require('../db/pool');

const router = express.Router();
const SEVERITY_RANK = { high: 0, medium: 1, low: 2 };

router.get('/', async (req, res, next) => {
  try {
    const { audit_id } = req.query;
    if (!audit_id) return res.status(400).json({ error: 'audit_id query param is required' });
    const { rows } = await pool.query('SELECT * FROM v_concerns WHERE audit_id = $1', [audit_id]);
    rows.sort((a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { audit_id, entity_type, entity_id, description, severity } = req.body;
    if (!audit_id || !description) {
      return res.status(400).json({ error: 'audit_id and description are required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO concern_flags (audit_id, entity_type, entity_id, description, severity)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'medium')) RETURNING *`,
      [audit_id, entity_type, entity_id, description, severity]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM concern_flags WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
