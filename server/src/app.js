import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import configRoutes from './routes/config.js';
import csvRoutes from './routes/csv.js';
import reportRoutes from './routes/reports.js';
import shareRoutes from './routes/share.js';
import airtableRoutes from './routes/airtable.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { startWeeklyEmailJob } from './jobs/weeklyEmailJob.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Build the Express app. Exported separately from the listener so tests can
 * mount it with supertest without binding a port.
 */
export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // correct protocol/host behind Render's proxy
  app.use(cors());
  app.use(express.json({ limit: '8mb' })); // published reports can be sizeable

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/config', configRoutes);
  app.use('/api/csv', csvRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/reports', shareRoutes); // /api/reports/publish, /api/reports/shared/:id
  app.use('/api/airtable', airtableRoutes);
  startWeeklyEmailJob();

  // Serve the built client (client/dist) from the same process whenever it has
  // been built (production deploys like Render) — falls back gracefully in dev.
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (process.env.NODE_ENV === 'production' || fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export default createApp;
