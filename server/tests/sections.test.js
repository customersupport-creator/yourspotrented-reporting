import highlights from '../src/engine/sections/highlights.js';
import customerService from '../src/engine/sections/customerService.js';
import netRemit from '../src/engine/sections/netRemit.js';
import refunds from '../src/engine/sections/refunds.js';
import expenses from '../src/engine/sections/expenses.js';
import { buildCharts } from '../src/engine/charts.js';
import { normalizedSample, config, EXPECTED } from './fixtures.js';

const { rows } = normalizedSample();

describe('highlights section', () => {
  it('counts towed, paid, encoded', () => {
    expect(highlights.compute(rows, config)).toEqual({
      towed: EXPECTED.towed,
      paid: EXPECTED.paid,
      encoded: EXPECTED.encoded,
    });
  });

  it('counts each tow-log record (by license plate) as towed', () => {
    const towLogRows = [
      { _towLogSource: true, licensePlate: '4BCH14', towingCompany: 'Todisco' }, // towed
      { _towLogSource: true, licensePlate: '313V20', towingCompany: 'Roberts' }, // towed
      { _towLogSource: true, licensePlate: '', towingCompany: '' }, // blank record -> not towed
    ];
    expect(highlights.compute(towLogRows, config).towed).toBe(2);
  });

  it('does NOT use a status column to count tow-log records', () => {
    // Tow-log rows where a status column says something else must still count
    // by plate presence, and a blank-plate row must not count.
    const rows = [
      { _towLogSource: true, licensePlate: 'ABC123', towingStatus: 'Released' }, // counts (plate)
      { _towLogSource: true, licensePlate: '', towingStatus: 'Towed' }, // does NOT count (no plate)
    ];
    expect(highlights.compute(rows, config).towed).toBe(1);
  });

  it('falls back to towing STATUS keywords for non-tow-log files', () => {
    const statusRows = [
      { violationStatus: 'Encoded', towingStatus: 'Pending' },
      { violationStatus: 'Encoded', towingStatus: 'Released' },
      { violationStatus: 'Encoded', towingStatus: 'Towed' }, // only this one
    ];
    expect(highlights.compute(statusRows, config).towed).toBe(1);
  });
});

describe('customerService section', () => {
  it('counts CS cases and groups activities by type', () => {
    const result = customerService.compute(rows, config);
    expect(result.caseCount).toBe(EXPECTED.csCases);
    const types = result.activities.map((a) => a.type.toLowerCase()).sort();
    expect(types).toEqual(['complaint', 'inquiry', 'request']);
  });
});

describe('netRemit section', () => {
  it('sums net remit for paid rows only', () => {
    expect(netRemit.compute(rows, config).total).toBe(EXPECTED.netRemit);
  });
});

describe('refunds section', () => {
  it('splits processed vs pending with amounts', () => {
    const result = refunds.compute(rows, config);
    expect(result.processed).toEqual(EXPECTED.refundsProcessed);
    expect(result.pending).toEqual(EXPECTED.refundsPending);
  });
});

describe('expenses section', () => {
  it('totals expenses and builds a category breakdown', () => {
    const result = expenses.compute(rows, config);
    expect(result.total).toBe(EXPECTED.expensesTotal);
    expect(result.byCategory[0]).toMatchObject({ category: 'Fuel', amount: 1200, percent: 100 });
  });
});

describe('charts', () => {
  it('produces all four datasets', () => {
    const charts = buildCharts(rows, config);
    expect(charts).toHaveProperty('violationsTrend');
    expect(charts).toHaveProperty('paymentsTrend');
    expect(charts.refundBreakdown.length).toBe(2);
    expect(charts.expenseBreakdown).toEqual([{ category: 'Fuel', amount: 1200 }]);
  });
});
