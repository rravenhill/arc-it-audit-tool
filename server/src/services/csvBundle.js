const { stringify } = require('csv-stringify/sync');
const archiver = require('archiver');
const { PassThrough } = require('stream');

// Every audit-scoped entity table - deliberately excludes concern_flags/v_concerns (findings
// are reviewed separately, not part of the raw captured audit data) and images (binary files,
// not a CSV-shaped table).
const CHILD_TABLES = [
  'internet_connections', 'networks', 'active_directory', 'infrastructure_items',
  'comms_rooms', 'software', 'vendor_support',
];

function flattenValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    // Arrays of plain values (e.g. server_roles) read better as "a; b" than as a JSON blob.
    if (value.every((v) => v === null || typeof v !== 'object')) return value.join('; ');
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined) return '';
  return value;
}

function flattenRow(row) {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, flattenValue(v)]));
}

async function buildCsvBundle(pool, auditId) {
  const auditRes = await pool.query('SELECT id FROM audits WHERE id = $1', [auditId]);
  if (!auditRes.rows[0]) {
    const err = new Error('Audit not found');
    err.status = 404;
    throw err;
  }

  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = new PassThrough();
  const chunks = [];
  output.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    output.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
  });
  archive.pipe(output);

  for (const table of CHILD_TABLES) {
    // eslint-disable-next-line no-await-in-loop
    const { rows } = await pool.query(`SELECT * FROM ${table} WHERE audit_id = $1 ORDER BY id`, [auditId]);
    if (!rows.length) continue;
    const csv = stringify(rows.map(flattenRow), { header: true });
    archive.append(csv, { name: `${table}.csv` });
  }

  await archive.finalize();
  return finished;
}

module.exports = { buildCsvBundle };
