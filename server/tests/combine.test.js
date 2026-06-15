import request from 'supertest';
import { combineFiles, buildEffectiveMap } from '../src/services/combine.js';
import { validateCoverage, MappingError } from '../src/services/mapper.js';
import { defaultConfig } from '../src/config/defaultMapping.js';
import { createApp } from '../src/app.js';

const app = createApp();
const buf = (s) => Buffer.from(s);

// Data spread across files: violations in one, payments+remit in another,
// expenses in a third. Each file uses slightly different header names.
const VIOLATIONS = `Txn Date,Violation,Towing\n2026-06-01,Encoded,Towed\n2026-06-02,Encoded,Towed`;
const PAYMENTS = `date,Payment,Net Remit\n2026-06-01,Paid,1350\n2026-06-02,Paid,1350`;
const EXPENSES = `Date,Expense Category,Cost\n2026-06-01,Fuel,1200`;

describe('buildEffectiveMap', () => {
  it('auto-maps differing header names to logical fields', () => {
    const map = buildEffectiveMap(['Txn Date', 'Violation', 'Towing'], defaultConfig);
    expect(map.date).toBe('Txn Date');
    expect(map.violationStatus).toBe('Violation');
    expect(map.towingStatus).toBe('Towing');
  });
});

describe('combineFiles', () => {
  it('unions rows from multiple files and normalizes each independently', () => {
    const files = [
      { name: 'violations.csv', buffer: buf(VIOLATIONS) },
      { name: 'payments.csv', buffer: buf(PAYMENTS) },
      { name: 'expenses.csv', buffer: buf(EXPENSES) },
    ];
    const { rows } = combineFiles(files, defaultConfig);
    expect(rows.length).toBe(5); // 2 + 2 + 1
    // violationStatus came from file 1, netRemitAmount from file 2, expense from file 3
    expect(rows.some((r) => r.violationStatus === 'Encoded')).toBe(true);
    expect(rows.some((r) => r.netRemitAmount === 1350)).toBe(true);
    expect(rows.some((r) => r.expenseCategory === 'Fuel')).toBe(true);
  });
});

describe('validateCoverage', () => {
  it('passes when required fields are covered across the union', () => {
    const files = [
      { name: 'v.csv', buffer: buf(VIOLATIONS) },
      { name: 'p.csv', buffer: buf(PAYMENTS) },
    ];
    const { rows } = combineFiles(files, defaultConfig);
    expect(() => validateCoverage(rows, defaultConfig)).not.toThrow();
  });

  it('throws 422 only when NO file covers the required date', () => {
    const noDate = combineFiles([{ name: 'x.csv', buffer: buf('Payment,Net Remit\nPaid,1350') }], defaultConfig).rows;
    try {
      validateCoverage(noDate, defaultConfig);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(MappingError);
      expect(e.details.missingFields).toContain('date');
    }
  });
});

describe('POST /api/reports/generate with multiple files', () => {
  it('combines files and produces a correct report', async () => {
    const res = await request(app)
      .post('/api/reports/generate')
      .attach('files', buf(VIOLATIONS), 'violations.csv')
      .attach('files', buf(PAYMENTS), 'payments.csv')
      .attach('files', buf(EXPENSES), 'expenses.csv');

    expect(res.status).toBe(200);
    expect(res.body.sections.highlights.towed).toBe(2);
    expect(res.body.sections.highlights.paid).toBe(2);
    expect(res.body.sections.highlights.encoded).toBe(2);
    expect(res.body.sections.netRemit.total).toBe(2700);
    expect(res.body.sections.expenses.total).toBe(1200);
    expect(res.body.meta.fileCount).toBe(3);
  });

  it('counts towed as the number of tow-log records (by license plate)', async () => {
    // A tow log: every row is a completed tow. Real-world export columns.
    const towLog = [
      'DATE,FACILITY,TOWING COMPANY,LICENSE PLATE,TOW TIME REQUEST,TOWED TIME,REQUESTED BY,RESELL STATUS,REMARKS',
      '6/4/2026,Spot A,Todisco Towing,4BCH14,6/4/2026 7:51am,6/4/2026 9:25am,DONITA,Resell,',
      '6/4/2026,Spot B,Roberts Towing,313V20,6/4/2026 1:55pm,6/4/2026 2:52pm,GWEN,N/A,',
      '6/6/2026,Spot C,ANT Towing,FLN1679,6/6/2026 10:30pm,6/6/2026 11:00pm,MICHAEL,N/A,note',
      '6/7/2026,Spot C,ANT Towing,FLN 1679,6/6/2026 10:30pm,6/6/2026 11:00pm,ANGEL,N/A,note',
    ].join('\n');

    const res = await request(app)
      .post('/api/reports/generate')
      .attach('files', buf(towLog), 'towed-illegal-parkers.csv');

    expect(res.status).toBe(200);
    expect(res.body.sections.highlights.towed).toBe(4); // one per tow record
  });

  it('derives encoded + paid ONLY from the Parkpliant Violations sheet', async () => {
    // The Parkpliant sheet: 4 notices, only 1 is Paid (has Settlement date).
    const parkpliant = [
      'Violation Notice number,Encoded by,Violation Amount,Violation Status,Settlement date',
      'T-1,Gwen,75,Paid,6/5/2026',
      'T-2,Gwen,75,Encoded,',
      'T-3,CJ,100,Encoded,',
      'T-4,Joan,150,Encoded,',
    ].join('\n');
    // A SEPARATE payments sheet that must NOT contribute to "paid on Parkpliant".
    const payments = 'date,Payment Status,Net Remit\n2026-06-01,Paid,1000\n2026-06-02,Paid,1000';

    const res = await request(app)
      .post('/api/reports/generate')
      .attach('files', buf(parkpliant), 'ParkpliantViolations.csv')
      .attach('files', buf(payments), 'payments.csv');

    expect(res.status).toBe(200);
    expect(res.body.sections.highlights.encoded).toBe(4); // every notice
    expect(res.body.sections.highlights.paid).toBe(1); // only the Parkpliant Paid one (not the 2 in payments)
  });

  it('counts Customer Service as every record in the Customer Tracking sheet', async () => {
    const tracking = [
      'SOURCE,DATE,RENTAL ID,REASON FOR CONTACT CATEGORY,ASSISTED BY,STATUS',
      'Ring Central,6/7/2026,1,REACH OUT - INCORRECTLY PARKED,Christine,Resolved',
      'Ring Central,6/7/2026,2,INACTIVE MONTHLY REACH OUT,Jian,Resolved',
      'Ring Central,6/7/2026,3,MAINTENANCE REACH OUT,Jian,Resolved',
    ].join('\n');
    const res = await request(app)
      .post('/api/reports/generate')
      .attach('files', buf(tracking), 'CustomerTrackingSheet2026.csv');
    expect(res.status).toBe(200);
    expect(res.body.sections.customerService.caseCount).toBe(3); // all records
  });

  it('derives Expenses ONLY from the Management Expenses sheet (refunds excluded)', async () => {
    const management = [
      'DATE,AMOUNT,PURPOSE,CATEGORY',
      '6/5/2026,31.92,Fuel,PARKING ENFORCEMENT',
      '6/6/2026,60.00,Subscription,DUES/SUBSCRIPTION',
    ].join('\n');
    // Refunds sheet has CATEGORY=REFUND with amounts — must NOT count as expenses.
    const refunds = [
      'DATE,AMOUNT,REASON CATEGORY,STATUS,CATEGORY',
      '6/2/2026,21.00,Lot full,PAID,REFUND',
      '6/3/2026,11.99,Lot full,PAID,REFUND',
    ].join('\n');
    const res = await request(app)
      .post('/api/reports/generate')
      .attach('files', buf(management), 'Management expenses 2026.csv')
      .attach('files', buf(refunds), 'Refunds.csv');
    expect(res.status).toBe(200);
    expect(res.body.sections.expenses.total).toBe(91.92); // 31.92 + 60, not the refunds
    const cats = res.body.sections.expenses.byCategory.map((c) => c.category);
    expect(cats).not.toContain('REFUND');
  });

  it('itemizes a per-file breakdown (CS omitted) alongside combined totals', async () => {
    const res = await request(app)
      .post('/api/reports/generate')
      .attach('files', buf(VIOLATIONS), 'violations.csv')
      .attach('files', buf(PAYMENTS), 'payments.csv')
      .attach('files', buf(EXPENSES), 'expenses.csv');

    expect(res.status).toBe(200);
    expect(res.body.perFileReports).toHaveLength(3);

    const names = res.body.perFileReports.map((r) => r.name).sort();
    expect(names).toEqual(['expenses.csv', 'payments.csv', 'violations.csv']);

    const violations = res.body.perFileReports.find((r) => r.name === 'violations.csv');
    expect(violations.sections.highlights.towed).toBe(2);
    expect(violations.sections.customerService).toBeUndefined(); // CS stays combined-only

    const expenses = res.body.perFileReports.find((r) => r.name === 'expenses.csv');
    expect(expenses.sections.expenses.total).toBe(1200);
  });
});
