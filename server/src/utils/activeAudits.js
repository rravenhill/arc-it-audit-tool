// A site may only be attached to one in_progress audit at a time (it can be re-audited
// once that audit is completed). Both the "create audit" and "add site to audit" entry
// points need this same check, so it lives here rather than being duplicated per-route.
async function findSitesWithActiveAudit(client, siteIds, excludeAuditId) {
  if (!Array.isArray(siteIds) || !siteIds.length) return [];
  const { rows } = await client.query(
    `SELECT DISTINCT s.id, s.name
     FROM audit_sites asx
     JOIN audits a ON a.id = asx.audit_id
     JOIN sites s ON s.id = asx.site_id
     WHERE asx.site_id = ANY($1::int[])
       AND a.status = 'in_progress'
       AND ($2::int IS NULL OR a.id != $2)`,
    [siteIds, excludeAuditId || null]
  );
  return rows;
}

module.exports = { findSitesWithActiveAudit };
