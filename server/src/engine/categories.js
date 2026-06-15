/**
 * Expense category normalization — keeps category handling consistent and
 * configurable so the same business rules apply in the expenses section, the
 * charts, and the per-file breakdown.
 *
 * Driven by config:
 *   - expenseCategoryAliases : { "<lowercased source>": "Canonical Name" }
 *       e.g. "other" / "other expenses" -> "Management Expenses"
 *   - nonMonetaryCategories  : ["<lowercased category>", ...]
 *       categories that are tracking-only and must NOT contribute any amount
 *       (e.g. "Customer Tracking Sheet").
 */

/** Map a raw category value to its canonical display name (alias-aware). */
export function canonicalCategory(raw, config) {
  const name = String(raw || '').trim();
  if (name === '') return '';
  const aliases = config.expenseCategoryAliases || {};
  return aliases[name.toLowerCase()] || name;
}

/** Is this category tracking-only (no monetary value)? */
export function isNonMonetary(raw, config) {
  const key = String(raw || '').trim().toLowerCase();
  if (key === '') return false;
  return (config.nonMonetaryCategories || []).some((c) => String(c).trim().toLowerCase() === key);
}

/**
 * The expense amount for a row. Uses the dedicated expense-amount column when
 * one is mapped; only falls back to the generic amount column when no expense
 * amount column exists (single-Amount CSVs). Prevents non-expense amounts from
 * leaking into expense totals.
 */
export function expenseAmountFor(row, config) {
  const hasExpenseAmountColumn = Boolean(config.columnMap?.expenseAmount);
  const primary = Number(row.expenseAmount) || 0;
  if (primary) return primary;
  if (!hasExpenseAmountColumn) return Number(row.amount) || 0;
  return 0;
}
