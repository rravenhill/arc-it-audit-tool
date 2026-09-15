const express = require('express');
const pool = require('../db/pool');
const { findSitesWithActiveAudit } = require('../utils/activeAudits');

const router = express.Router({ mergeParams: true });

router.post('/', async (req, res, next) => {
  try {
    const { auditId } = req.params;
    const { site_id } = req.body;
    if (!site_id) return res.status(400).json({ error: 'site_id is required' });
    const conflicts = await findSitesWithActiveAudit(pool, [site_id], auditId);
    if (conflicts.length) {
      return res.status(409).json({ error: `Already has an audit in progress: ${conflicts[0].name}` });
    }
    const { rows } = await pool.query(
      `INSERT INTO audit_sites (audit_id, site_id) VALUES ($1, $2)
       ON CONFLICT (audit_id, site_id) DO NOTHING RETURNING *`,
      [auditId, site_id]
    );
    if (!rows[0]) return res.status(200).json({ audit_id: Number(auditId), site_id: Number(site_id) });
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:siteId', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM audit_sites WHERE audit_id = $1 AND site_id = $2', [
      req.params.auditId,
      req.params.siteId,
    ]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
