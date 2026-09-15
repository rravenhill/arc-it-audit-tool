const PDFDocument = require('pdfkit');

// Arc Systems brand colours - kept in sync with client/src/index.css's CSS variables.
const CHARCOAL = '#302a32';
const MINT = '#14f8af';
const MINT_DARK = '#0dc98d';
const TEXT_MUTED = '#6b6670';
const DANGER = '#c0392b';
const WARNING = '#b8860b';

const SEVERITY_RANK = { high: 0, medium: 1, low: 2 };
const SEVERITY_COLORS = { high: DANGER, medium: WARNING, low: TEXT_MUTED };

// Mirrors ConcernList.jsx's ENTITY_TYPE_LABELS - what a system concern applies to, so the
// PDF reads the same way the Review page does.
const ENTITY_TYPE_LABELS = {
  infrastructure_item: 'Infrastructure Item',
  comms_room: 'Comms Room',
  software: 'Software',
  vendor_support: 'Vendor Support',
  internet_connection: 'Internet Connection',
  active_directory: 'Active Directory',
};

function concernTitle(c) {
  if (c.category === 'manual') return c.title || 'General';
  return ENTITY_TYPE_LABELS[c.entity_type] || c.title || 'General';
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function drawSectionHeading(doc, text) {
  doc.font('Helvetica-Bold').fontSize(14).fillColor(CHARCOAL).text(text);
  const underlineY = doc.y + 4;
  doc
    .moveTo(50, underlineY)
    .lineTo(50 + doc.widthOfString(text) + 20, underlineY)
    .lineWidth(2)
    .strokeColor(MINT)
    .stroke();
  doc.moveDown(1.2);
}

async function buildPdfReport(pool, auditId) {
  const auditRes = await pool.query(
    `SELECT a.*, c.name AS customer_name
     FROM audits a JOIN customers c ON c.id = a.customer_id
     WHERE a.id = $1`,
    [auditId]
  );
  const audit = auditRes.rows[0];
  if (!audit) {
    const err = new Error('Audit not found');
    err.status = 404;
    throw err;
  }

  const sitesRes = await pool.query(
    `SELECT s.name FROM sites s JOIN audit_sites asx ON asx.site_id = s.id WHERE asx.audit_id = $1 ORDER BY s.name`,
    [auditId]
  );
  const siteNames = sitesRes.rows.map((r) => r.name).join(', ');

  const concernsRes = await pool.query('SELECT * FROM v_concerns WHERE audit_id = $1', [auditId]);
  const concerns = concernsRes.rows.sort((a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3));

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  // --- Title page ---
  doc.rect(0, 0, doc.page.width, 8).fill(MINT);
  doc.moveDown(3);

  doc.font('Helvetica-Bold').fontSize(11).fillColor(MINT_DARK).text('ARC SYSTEMS - IT AUDIT REPORT', {
    characterSpacing: 1,
  });

  doc.moveDown(1.2);
  doc.font('Helvetica-Bold').fontSize(26).fillColor(CHARCOAL).text(audit.customer_name);

  if (siteNames) {
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(13).fillColor(TEXT_MUTED).text(siteNames);
  }

  doc.moveDown(1);
  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor(CHARCOAL)
    .text(`Audit Date: ${formatDate(audit.audit_date) || 'Not recorded'}`)
    .text(`Engineer: ${audit.engineer_name || 'Not recorded'}`);

  if (audit.autotask_ticket_number) {
    doc.text(`Ticket: ${audit.autotask_ticket_number}`);
  }

  doc.moveDown(1);
  doc
    .moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .lineWidth(2)
    .strokeColor(MINT)
    .stroke();
  doc.moveDown(1);

  if (audit.summary_notes) {
    doc.font('Helvetica-Bold').fontSize(12).fillColor(CHARCOAL).text('Summary');
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(10).fillColor(CHARCOAL).text(audit.summary_notes);
  }

  // --- Findings & Areas of Concern ---
  doc.addPage();
  drawSectionHeading(doc, 'Findings & Areas of Concern');

  if (!concerns.length) {
    doc.font('Helvetica').fontSize(10).fillColor(TEXT_MUTED).text('No concerns identified for this audit.');
  } else {
    concerns.forEach((c, i) => {
      const badgeColor = SEVERITY_COLORS[c.severity] || TEXT_MUTED;
      const label = (c.severity || '').toUpperCase();

      const badgeY = doc.y;
      doc.font('Helvetica-Bold').fontSize(8);
      const badgeWidth = doc.widthOfString(label) + 12;
      doc.roundedRect(50, badgeY, badgeWidth, 14, 7).fill(badgeColor);
      doc.fillColor('#ffffff').text(label, 50 + 6, badgeY + 3, { lineBreak: false });

      doc.x = 50;
      doc.y = badgeY + 18;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(CHARCOAL).text(concernTitle(c));
      doc.font('Helvetica').fontSize(10).fillColor(CHARCOAL).text(c.description);
      doc.moveDown(0.8);

      if (doc.y > doc.page.height - 100 && i < concerns.length - 1) doc.addPage();
    });
  }

  doc.end();
  return finished;
}

module.exports = { buildPdfReport };
