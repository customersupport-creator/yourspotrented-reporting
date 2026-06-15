import { Router } from 'express';
import { anyCsv } from '../middleware/upload.js';
import { validateCoverage } from '../services/mapper.js';
import { combineFiles } from '../services/combine.js';
import { resolveConfig } from '../config/defaultMapping.js';
import { generateReport } from '../engine/index.js';

/**
 * Report generation route.
 *
 * Pipeline: upload (one or many CSVs) -> resolve config -> combine + normalize
 * all files into one dataset -> validate coverage across the union -> generate
 * report (sections + charts + summary). Stateless: nothing is persisted.
 */
const router = Router();

router.post('/generate', anyCsv, (req, res, next) => {
  try {
    const uploaded = req.files || [];
    if (uploaded.length === 0) {
      const err = new Error('No CSV file was uploaded (expected form field "files").');
      err.status = 400;
      err.code = 'NO_FILE';
      throw err;
    }

    // Optional config (JSON string in a multipart text field).
    let userConfig;
    if (req.body?.config) {
      try {
        userConfig = JSON.parse(req.body.config);
      } catch {
        const err = new Error('The "config" field is not valid JSON.');
        err.status = 400;
        err.code = 'BAD_CONFIG';
        throw err;
      }
    }
    const config = resolveConfig(userConfig);

    const files = uploaded.map((f) => ({ name: f.originalname, buffer: f.buffer }));
    const { rows, perFile, warnings } = combineFiles(files, config);

    validateCoverage(rows, config);

    const report = generateReport(rows, config, {
      generatedAt: new Date().toISOString(),
      warnings,
      sources: perFile.map((p) => ({ name: p.name, rowCount: p.rowCount })),
      fileCount: files.length,
    });

    res.json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
