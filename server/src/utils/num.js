/**
 * Numeric + currency helpers. Kept tiny and dependency-free so they can be
 * reused by every section module and by tests.
 */

/**
 * Parse a CSV cell into a number. CSV values are strings and may contain
 * currency symbols, commas, or stray whitespace. Returns NaN when the value is
 * genuinely non-numeric so callers can decide how to handle it (the mapper
 * coerces NaN -> 0 and records a warning).
 */
export function parseNumber(value) {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, '').trim();
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return NaN;
  return Number(cleaned);
}

/** Like parseNumber but never NaN — unknown/blank becomes 0. */
export function toAmount(value) {
  const n = parseNumber(value);
  return Number.isNaN(n) ? 0 : n;
}

/** Round to 2 decimal places, avoiding floating-point noise. */
export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Format an amount as currency. Defaults to PHP. Uses Intl so grouping and the
 * symbol are correct (e.g. "PHP 185,000.00").
 */
export function formatCurrency(amount, currency = 'PHP') {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol', // "$1,234" for USD
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
      .format(value)
      .replace(/\u00A0/g, ' '); // normalize non-breaking spaces to plain spaces
  } catch {
    // Unknown currency code -> fall back to "<CODE> 1,234"
    return `${currency} ${new Intl.NumberFormat('en-US').format(value)}`;
  }
}

/** Format an integer count with thousands separators. */
export function formatCount(n) {
  return new Intl.NumberFormat('en-US').format(Math.round(n || 0));
}
