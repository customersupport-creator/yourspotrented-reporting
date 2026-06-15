import request from 'supertest';
import { createApp } from '../src/app.js';
import { SAMPLE_CSV, EXPECTED } from './fixtures.js';

const app = createApp();

describe('POST /api/reports/generate', () => {
  it('returns a full report for a valid CSV', async () => {
    const res = await request(app)
      .post('/api/reports/generate')
      .attach('file', Buffer.from(SAMPLE_CSV), 'weekly.csv');

    expect(res.status).toBe(200);
    expect(res.body.sections.highlights).toEqual({
      towed: EXPECTED.towed,
      paid: EXPECTED.paid,
      encoded: EXPECTED.encoded,
    });
    expect(res.body.sections.netRemit.total).toBe(EXPECTED.netRemit);
    expect(res.body.charts).toHaveProperty('expenseBreakdown');
    expect(typeof res.body.summary).toBe('string');
    expect(res.body.meta.rowCount).toBe(5);
    expect(res.body.meta.period).toEqual({ start: '2026-06-01', end: '2026-06-03' });
  });

  it('rejects a request with no file (400)', async () => {
    const res = await request(app).post('/api/reports/generate');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_FILE');
  });

  it('returns 422 when the required date column is missing', async () => {
    const csvMissingDate = 'Violation Status,Payment Status\nEncoded,Paid';
    const res = await request(app)
      .post('/api/reports/generate')
      .attach('file', Buffer.from(csvMissingDate), 'bad.csv');

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('MISSING_COLUMNS');
    expect(res.body.error.details.missingFields).toContain('date');
  });

  it('returns 400 for an empty CSV', async () => {
    const res = await request(app)
      .post('/api/reports/generate')
      .attach('file', Buffer.from(''), 'empty.csv');
    expect(res.status).toBe(400);
  });

  it('respects a custom config sent with the request', async () => {
    // Remap towing keyword so nothing classifies as towed.
    const config = JSON.stringify({ rules: { towed: ['hauled'] } });
    const res = await request(app)
      .post('/api/reports/generate')
      .field('config', config)
      .attach('file', Buffer.from(SAMPLE_CSV), 'weekly.csv');

    expect(res.status).toBe(200);
    expect(res.body.sections.highlights.towed).toBe(0);
  });
});

describe('GET /api/config/default', () => {
  it('returns the default config and section list', async () => {
    const res = await request(app).get('/api/config/default');
    expect(res.status).toBe(200);
    expect(res.body.config.columnMap).toHaveProperty('violationStatus');
    expect(res.body.sections.length).toBeGreaterThanOrEqual(5);
  });
});

describe('GET /api/health', () => {
  it('responds ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body).toEqual({ status: 'ok' });
  });
});
