import { Router } from 'express';
import { defaultConfig } from '../config/defaultMapping.js';
import { listSections } from '../engine/index.js';

/**
 * Config routes. The client fetches the default ReportConfig to pre-fill the
 * column-mapping admin panel, and the list of registered sections for display.
 */
const router = Router();

router.get('/default', (req, res) => {
  res.json({ config: defaultConfig, sections: listSections() });
});

export default router;
