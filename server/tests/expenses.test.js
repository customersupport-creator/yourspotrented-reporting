import expenses from '../src/engine/sections/expenses.js';
import { parseCsv } from '../src/services/csvParser.js';
import { mapCsv } from '../src/services/mapper.js';
import { defaultConfig } from '../src/config/defaultMapping.js';

function normalize(csv) {
  const { headers, rows } = parseCsv(csv);
  return mapCsv(headers, rows, defaultConfig).rows;
}

const CSV = `Date,Violation Status,Expense Category,Expense Amount,Amount
2026-06-01,Encoded,Fuel,1200,1500
2026-06-02,Encoded,Other,800,1500
2026-06-03,Encoded,Other Expenses,200,800
2026-06-04,Encoded,Customer Tracking Sheet,999,1500
2026-06-05,Encoded,,,1500
2026-06-06,Encoded,Supplies,0,800`;

describe('expenses section — category rules', () => {
  const result = expenses.compute(normalize(CSV), defaultConfig);
  const byCat = Object.fromEntries(result.byCategory.map((c) => [c.category, c]));

  it('folds Other / Other Expenses into Management Expenses', () => {
    expect(byCat['Management Expenses']).toBeTruthy();
    expect(byCat['Management Expenses'].amount).toBe(1000); // 800 + 200
    expect(byCat.Other).toBeUndefined();
  });

  it('treats Customer Tracking Sheet as tracking-only (no amount)', () => {
    expect(byCat['Customer Tracking Sheet'].tracking).toBe(true);
    expect(byCat['Customer Tracking Sheet'].amount).toBe(0);
  });

  it('excludes blank and zero-value categories from the total', () => {
    // Fuel 1200 + Management 1000 = 2200; tracking sheet 0, blank excluded,
    // Supplies has 0 expense amount so it is dropped from the table.
    expect(result.total).toBe(2200);
    expect(byCat.Supplies).toBeUndefined();
  });

  it('does NOT leak the generic Amount column into expense totals', () => {
    // Each row also has an Amount (violation fee); none of it should be summed
    // because a dedicated Expense Amount column is mapped.
    expect(result.total).toBe(2200);
  });
});
