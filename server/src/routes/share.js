import { Router } from 'express';
import { saveReport, getReport } from '../services/reportStore.js';

/**
 * Publish & share routes.
 *  - POST /api/reports/publish  { report, remit? } -> { id }
 *  - GET  /api/reports/shared/:id -> { report, remit, publishedAt }
 *
 * The client turns the id into a public link: <origin>/r/<id>.
 */
const router = Router();

router.post('/publish', (req, res, next) => {
  try {
    const { report, remit } = req.body || {};
    if (!report || !report.sections) {
      const err = new Error('A generated report is required to publish a share link.');
      err.status = 400;
      err.code = 'NO_REPORT';
      throw err;
    }
    // Strip the (UI-unused) per-file breakdown to keep stored payloads lean.
    const { perFileReports, ...slimReport } = report;
    const id = saveReport({ report: slimReport, remit: remit || null, publishedAt: new Date().toISOString() });
    res.json({ id });
  } catch (err) {
    next(err);
  }
});

router.get('/shared/:id', (req, res, next) => {
  try {
    const payload = getReport(req.params.id);
    if (!payload) {
      const err = new Error('This shared report was not found or has expired.');
      err.status = 404;
      err.code = 'SHARE_NOT_FOUND';
      throw err;
    }
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

export default router;
