import { classify } from '../services/mapper.js';
import { round2 } from '../utils/num.js';
import { canonicalCategory, isNonMonetary, expenseAmountFor } from './categories.js';

/**
 * Build the datasets the dashboard charts consume. Kept separate from sections
 * because charts are a cross-cutting view of the same rows (trends over time,
 * status breakdowns) rather than a numbered report section.
 */

/** Reduce a date string to a grouping key (day = YYYY-MM-DD, week = ISO-ish). */
function dateKey(value, grouping) {
  const raw = String(value || '').trim();
  if (raw === '') return 'Unknown';
  if (grouping !== 'week') return raw.slice(0, 10);

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  // Year-Week bucket
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function sortByLabel(a, b) {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

export function buildCharts(rows, config) {
  const { rules, dateGrouping = 'day' } = config;

  // --- Violations Trend: count of encoded rows per date bucket ---
  const violMap = new Map();
  // --- Payments Trend: count + net amount of paid rows per date bucket ---
  const payMap = new Map();

  for (const row of rows) {
    const key = dateKey(row.date, dateGrouping);

    if (classify(row.violationStatus, rules.encoded)) {
      violMap.set(key, (violMap.get(key) || 0) + 1);
    }
    if (classify(row.paymentStatus, rules.paid)) {
      const entry = payMap.get(key) || { count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += Number(row.netRemitAmount) || 0;
      payMap.set(key, entry);
    }
  }

  const violationsTrend = [...violMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort(sortByLabel);

  const paymentsTrend = [...payMap.entries()]
    .map(([date, v]) => ({ date, count: v.count, amount: round2(v.amount) }))
    .sort(sortByLabel);

  // --- Refund Status Breakdown ---
  const refundBuckets = { Processed: { count: 0, amount: 0 }, Pending: { count: 0, amount: 0 } };
  for (const row of rows) {
    const amt = Number(row.refundAmount) || 0;
    if (classify(row.refundStatus, rules.refundProcessed)) {
      refundBuckets.Processed.count += 1;
      refundBuckets.Processed.amount += amt;
    } else if (classify(row.refundStatus, rules.refundPending)) {
      refundBuckets.Pending.count += 1;
      refundBuckets.Pending.amount += amt;
    }
  }
  const refundBreakdown = Object.entries(refundBuckets)
    .map(([status, v]) => ({ status, count: v.count, amount: round2(v.amount) }))
    .filter((b) => b.count > 0 || b.amount > 0);

  // --- Expense Breakdown by category (alias-normalized, monetary only) ---
  const expMap = new Map();
  for (const row of rows) {
    const rawCategory = (row.expenseCategory || '').trim();
    if (rawCategory === '') continue;
    if (isNonMonetary(rawCategory, config)) continue; // tracking-only: no amount
    const category = canonicalCategory(rawCategory, config);
    const amount = expenseAmountFor(row, config);
    expMap.set(category, (expMap.get(category) || 0) + amount);
  }
  const expenseBreakdown = [...expMap.entries()]
    .map(([category, amount]) => ({ category, amount: round2(amount) }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return { violationsTrend, paymentsTrend, refundBreakdown, expenseBreakdown };
}

export default buildCharts;
