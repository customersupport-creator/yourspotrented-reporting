import { Router } from 'express';
import { anyCsv } from '../middleware/upload.js';
import { parseCsv } from '../services/csvParser.js';

/**
 * CSV preview route — used by the mapping UI. Accepts one or many files and
 * returns the UNION of detected headers (so the mapping panel can bind any
 * column from any file) plus per-file row counts and warnings.
 */
const router = Router();

router.post('/preview', anyCsv, (req, res, next) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      const err = new Error('No CSV file was uploaded (expected form field "files").');
      err.status = 400;
      err.code = 'NO_FILE';
      throw err;
    }

    const unionHeaders = new Set();
    const perFile = [];
    const warnings = [];
    let totalRows = 0;
    let sampleRows = [];

    for (const f of files) {
      const { headers, rows, warnings: w } = parseCsv(f.buffer);
      headers.forEach((h) => unionHeaders.add(h));
      totalRows += rows.length;
      if (sampleRows.length < 10) sampleRows = sampleRows.concat(rows.slice(0, 10 - sampleRows.length));
      perFile.push({ name: f.originalname, headers, rowCount: rows.length });
      (w || []).forEach((msg) => warnings.push(`[${f.originalname}] ${msg}`));
    }

    res.json({
      headers: [...unionHeaders],
      rows: sampleRows,
      rowCount: totalRows,
      fileCount: files.length,
      perFile,
      warnings,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
