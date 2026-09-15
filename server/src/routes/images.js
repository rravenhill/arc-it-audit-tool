const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const sharp = require('sharp');
const pool = require('../db/pool');
const { upload, uploadsDir } = require('../middleware/upload');

const router = express.Router();
const MAX_DIMENSION = 1600;

router.get('/', async (req, res, next) => {
  try {
    const { audit_id, entity_type, entity_id } = req.query;
    const conditions = [];
    const values = [];
    if (audit_id) {
      values.push(audit_id);
      conditions.push(`audit_id = $${values.length}`);
    }
    if (entity_type) {
      values.push(entity_type);
      conditions.push(`entity_type = $${values.length}`);
    }
    if (entity_id) {
      values.push(entity_id);
      conditions.push(`entity_id = $${values.length}`);
    }
    if (!values.length) return res.status(400).json({ error: 'audit_id or entity_type+entity_id is required' });
    const { rows } = await pool.query(
      `SELECT * FROM images WHERE ${conditions.join(' AND ')} ORDER BY created_at`,
      values
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const { audit_id, entity_type, entity_id, caption } = req.body;
    if (!req.file) return res.status(400).json({ error: 'image file is required' });
    if (!audit_id || !entity_type || !entity_id) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'audit_id, entity_type and entity_id are required' });
    }

    try {
      const resizedBuffer = await sharp(req.file.path)
        .rotate()
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .toBuffer();
      await fs.writeFile(req.file.path, resizedBuffer);
      const stat = await fs.stat(req.file.path);

      const { rows } = await pool.query(
        `INSERT INTO images (entity_type, entity_id, audit_id, file_path, original_filename, mime_type, file_size_bytes, caption)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [entity_type, entity_id, audit_id, req.file.filename, req.file.originalname, req.file.mimetype, stat.size, caption || null]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      await fs.unlink(req.file.path).catch(() => {});
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('DELETE FROM images WHERE id = $1 RETURNING file_path', [req.params.id]);
    if (rows[0]) {
      await fs.unlink(path.join(uploadsDir, rows[0].file_path)).catch(() => {});
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
