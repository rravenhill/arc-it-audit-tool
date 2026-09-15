const express = require('express');
const pool = require('../db/pool');
const { importAuditJson } = require('../services/auditJson');
const { buildPdfReport } = require('../services/pdfReport');
const { buildCsvBundle } = require('../services/csvBundle');

const router = express.Router();

router.get('/:auditId/pdf', async (req, res, next) => {
  try {
    const pdfBuffer = await buildPdfReport(pool, req.params.auditId);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="audit-${req.params.auditId}-report.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

router.get('/:auditId/csv', async (req, res, next) => {
  try {
    const zipBuffer = await buildCsvBundle(pool, req.params.auditId);
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename="audit-${req.params.auditId}-csv-bundle.zip"`);
    res.send(zipBuffer);
  } catch (err) {
    next(err);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const result = await importAuditJson(pool, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
