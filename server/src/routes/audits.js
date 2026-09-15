const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const pool = require('../db/pool');
const { uploadsDir } = require('../middleware/upload');
const { findSitesWithActiveAudit } = require('../utils/activeAudits');

const router = express.Router();

// Only attach sites that actually belong to this customer - a stale/mistyped
// site_id must never silently attach another customer's site to this audit.
async function filterOwnedSiteIds(client, customerId, siteIds) {
  if (!Array.isArray(siteIds) || !siteIds.length) return [];
  const { rows } = await client.query('SELECT id FROM sites WHERE customer_id = $1 AND id = ANY($2::int[])', [
    customerId,
    siteIds,
  ]);
  return rows.map((r) => r.id);
}

router.get('/', async (req, res, next) => {
  try {
    const { customer_id, site_id, ticket, status, date_from, date_to, q } = req.query;
    const conditions = [];
    const values = [];
    let joinSites = '';

    if (site_id) {
      joinSites = 'JOIN audit_sites asx ON asx.audit_id = a.id';
      values.push(site_id);
      conditions.push(`asx.site_id = $${values.length}`);
    }
    if (customer_id) {
      values.push(customer_id);
      conditions.push(`a.customer_id = $${values.length}`);
    }
    if (ticket) {
      values.push(`%${ticket}%`);
      conditions.push(`a.autotask_ticket_number ILIKE $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`a.status = $${values.length}`);
    }
    if (date_from) {
      values.push(date_from);
      conditions.push(`a.audit_date >= $${values.length}`);
    }
    if (date_to) {
      values.push(date_to);
      conditions.push(`a.audit_date <= $${values.length}`);
    }
    if (q) {
      values.push(`%${q}%`);
      conditions.push(`(c.name ILIKE $${values.length} OR a.autotask_ticket_number ILIKE $${values.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT DISTINCT a.*, c.name AS customer_name,
         (SELECT string_agg(s.name, ', ' ORDER BY s.name)
          FROM audit_sites site_link
          JOIN sites s ON s.id = site_link.site_id
          WHERE site_link.audit_id = a.id) AS site_names
       FROM audits a
       JOIN customers c ON c.id = a.customer_id
       ${joinSites}
       ${where}
       ORDER BY a.audit_date DESC NULLS LAST, a.id DESC`,
      values
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const auditRes = await pool.query(
      `SELECT a.*, c.name AS customer_name FROM audits a JOIN customers c ON c.id = a.customer_id WHERE a.id = $1`,
      [req.params.id]
    );
    if (!auditRes.rows[0]) return res.status(404).json({ error: 'Not found' });
    const sitesRes = await pool.query(
      `SELECT s.* FROM sites s JOIN audit_sites asx ON asx.site_id = s.id WHERE asx.audit_id = $1 ORDER BY s.name`,
      [req.params.id]
    );
    // Whether this audit has recorded anything reportable yet - drives whether the UI
    // offers the Review button (nothing captured yet means nothing to review).
    const hasDataRes = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM internet_connections WHERE audit_id = $1
         UNION ALL SELECT 1 FROM networks WHERE audit_id = $1
         UNION ALL SELECT 1 FROM active_directory WHERE audit_id = $1
         UNION ALL SELECT 1 FROM infrastructure_items WHERE audit_id = $1
         UNION ALL SELECT 1 FROM comms_rooms WHERE audit_id = $1
         UNION ALL SELECT 1 FROM software WHERE audit_id = $1
         UNION ALL SELECT 1 FROM vendor_support WHERE audit_id = $1
         UNION ALL SELECT 1 FROM images WHERE audit_id = $1
         UNION ALL SELECT 1 FROM concern_flags WHERE audit_id = $1
       ) AS has_data`,
      [req.params.id]
    );
    res.json({ ...auditRes.rows[0], sites: sitesRes.rows, has_data: hasDataRes.rows[0].has_data });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { customer_id, autotask_ticket_number, engineer_name, audit_date, status, summary_notes, site_ids } = req.body;
    if (!customer_id) return res.status(400).json({ error: 'customer_id is required' });

    await client.query('BEGIN');

    const ownedSiteIds = await filterOwnedSiteIds(client, customer_id, site_ids);
    const conflicts = await findSitesWithActiveAudit(client, ownedSiteIds, null);
    if (conflicts.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `Already has an audit in progress: ${conflicts.map((s) => s.name).join(', ')}`,
      });
    }

    const { rows } = await client.query(
      `INSERT INTO audits (customer_id, autotask_ticket_number, engineer_name, audit_date, status, summary_notes)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'in_progress'), $6) RETURNING *`,
      [customer_id, autotask_ticket_number, engineer_name, audit_date, status, summary_notes]
    );
    const audit = rows[0];

    for (const siteId of ownedSiteIds) {
      await client.query(
        'INSERT INTO audit_sites (audit_id, site_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [audit.id, siteId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(audit);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

const UPDATABLE_AUDIT_COLUMNS = ['autotask_ticket_number', 'engineer_name', 'audit_date', 'status', 'summary_notes'];

router.put('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { site_ids } = req.body;
    if (req.body.engineer_name !== undefined && !req.body.engineer_name?.trim()) {
      return res.status(400).json({ error: 'engineer_name is required' });
    }
    const updateColumns = UPDATABLE_AUDIT_COLUMNS.filter((c) => req.body[c] !== undefined);

    await client.query('BEGIN');

    let audit;
    if (updateColumns.length) {
      const values = updateColumns.map((c) => req.body[c]);
      const setClauses = updateColumns.map((c, i) => `${c} = $${i + 1}`);
      setClauses.push('updated_at = now()');
      values.push(req.params.id);
      const { rows } = await client.query(
        `UPDATE audits SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );
      audit = rows[0];
    } else {
      const { rows } = await client.query('SELECT * FROM audits WHERE id = $1', [req.params.id]);
      audit = rows[0];
    }

    if (!audit) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }

    if (Array.isArray(site_ids)) {
      const ownedSiteIds = await filterOwnedSiteIds(client, audit.customer_id, site_ids);
      const conflicts = await findSitesWithActiveAudit(client, ownedSiteIds, req.params.id);
      if (conflicts.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Already has an audit in progress: ${conflicts.map((s) => s.name).join(', ')}`,
        });
      }
      await client.query('DELETE FROM audit_sites WHERE audit_id = $1', [req.params.id]);
      for (const siteId of ownedSiteIds) {
        await client.query(
          'INSERT INTO audit_sites (audit_id, site_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [req.params.id, siteId]
        );
      }
    }

    await client.query('COMMIT');
    res.json(audit);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT file_path FROM images WHERE audit_id = $1', [req.params.id]);
    await pool.query('DELETE FROM audits WHERE id = $1', [req.params.id]);
    await Promise.all(rows.map((r) => fs.unlink(path.join(uploadsDir, r.file_path)).catch(() => {})));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
