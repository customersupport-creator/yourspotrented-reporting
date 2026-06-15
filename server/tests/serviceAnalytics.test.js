import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();
const buf = (s) => Buffer.from(s);

// A minimal Customer Tracking sheet (real column names).
const TRACKING = [
  'SOURCE,DATE,FRT,REASON FOR CONTACT CATEGORY,ACTION TAKEN CATEGORY,STATUS',
  'Ring Central,6/1/2026,0,Parking Inquiry,Noresponse,Resolved',
  'Ring Central,6/1/2026,2,Parking Inquiry,Confirmed,Resolved',
  'CSR Gvoice,6/2/2026,10,Maintenance RO,Relocated,Resolved',
  'Main Gvoice,6/2/2026,0,Parking Inquiry,Parked,Resolved',
  'Ring Central,6/3/2026,0,Revision RO,CorrectedParking,', // -> Other, unresolved
].join('\n');

describe('serviceAnalytics (Customer Service Performance)', () => {
  it('computes resolution, FRT, channels, and outcome buckets', async () => {
    const res = await request(app).post('/api/reports/generate').attach('files', buf(TRACKING), 'CustomerTrackingSheet2026.csv');
    expect(res.status).toBe(200);
    const a = res.body.sections.serviceAnalytics;

    expect(a.total).toBe(5);
    expect(a.resolved).toBe(4); // last row unresolved
    expect(a.resolutionRate).toBe(80);
    expect(a.frt.instant).toBe(3); // three rows with FRT 0
    expect(a.frt.peak).toBe(10);

    const ch = Object.fromEntries(a.channels.map((c) => [c.source, c.count]));
    expect(ch['Ring Central']).toBe(3);

    const out = Object.fromEntries(a.outcomes.map((o) => [o.outcome, o.count]));
    expect(out['No Response']).toBe(1);
    expect(out['Parked']).toBe(1);
    expect(out['Other']).toBe(1); // CorrectedParking -> Other, not Parked
  });

  it('is null when no tracking sheet is present', async () => {
    const csv = 'Date,Violation Status\n2026-06-01,Encoded';
    const res = await request(app).post('/api/reports/generate').attach('files', buf(csv), 'x.csv');
    expect(res.body.sections.serviceAnalytics).toBeNull();
  });
});
