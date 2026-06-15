import { round2 } from '../../utils/num.js';
import { canonicalCategory, isNonMonetary, expenseAmountFor } from '../categories.js';

/**
 * EXPENSES
 *  - total expenses (only categories with ACTUAL values are counted)
 *  - breakdown by expense category (alias-normalized, e.g. Other -> Management)
 *  - expense summary table (category, count, amount, % of total)
 *
 * Rules:
 *  - Rows with a blank expense category are ignored entirely.
 *  - Categories flagged non-monetary (e.g. "Customer Tracking Sheet") are listed
 *    for visibility but contribute 0 to the total — tracking only.
 *  - Aliases fold variants into a canonical category (e.g. "Other Expenses" ->
 *    "Management Expenses").
 *  - The total excludes blank/zero categories — only real values are summed.
 */
export default {
  key: 'expenses',
  title: 'Expenses',
  compute(rows, config) {
    const byCategoryMap = new Map();
    let total = 0;

    // Expenses come exclusively from the Management Expenses sheet when one is
    // present (so refunds/payments sheets never leak into expense totals).
    const hasExpenseSource = rows.some((r) => r._expenseSource);

    for (const row of rows) {
      if (hasExpenseSource && !row._expenseSource) continue; // only the expense sheet
      const rawCategory = (row.expenseCategory || '').trim();
      if (rawCategory === '') continue; // blank category -> excluded

      const tracking = isNonMonetary(rawCategory, config);
      const category = canonicalCategory(rawCategory, config);
      const amount = tracking ? 0 : expenseAmountFor(row, config);

      if (!byCategoryMap.has(category)) {
        byCategoryMap.set(category, { category, count: 0, amount: 0, tracking });
      }
      const entry = byCategoryMap.get(category);
      entry.count += 1;
      entry.amount += amount;
      // A canonical category is tracking-only only if every contributing row is.
      entry.tracking = entry.tracking && tracking;

      total += amount;
    }

    total = round2(total);

    const byCategory = [...byCategoryMap.values()]
      // Keep categories that have real value, plus tracking-only ones (for audit).
      .filter((e) => e.amount > 0 || e.tracking)
      .map((e) => ({
        category: e.category,
        count: e.count,
        amount: round2(e.amount),
        percent: total > 0 ? round2((e.amount / total) * 100) : 0,
        tracking: e.tracking,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { total, byCategory, table: byCategory };
  },
};
