import { toAmount, parseNumber } from '../utils/num.js';

/**
 * Data Mapping Module.
 *
 * Turns raw CSV rows (keyed by arbitrary header names) into *normalized* rows
 * keyed by logical field names, using the ReportConfig. It also exposes the
 * `classify` helper that every section uses to decide whether a status value
 * matches a configured rule — so "is this row towed?" is answered consistently
 * everywhere.
 */

export class MappingError extends Error {
  constructor(message, code = 'MAPPING_ERROR', details = {}) {
    super(message);
    this.name = 'MappingError';
    this.code = code;
    this.status = 422;
    this.details = details;
  }
}

/**
 * Does a cell value match any of the configured keywords for a rule?
 *
 * Matching is case-insensitive and WORD-aware so real-world values still
 * classify correctly:
 *   - exact:       "Towed"            matches "towed"
 *   - whole word:  "Vehicle Towed"    matches "towed" (token), "Towed - 2026-06-01" too
 *   - multi-word:  "Approved-Pending" matches the "approved-pending" keyword
 *
 * Whole-word (token) matching is deliberately used for single-word keywords so
 * that, e.g., "Unpaid" does NOT match the keyword "paid".
 *
 * @param {string} value     raw cell value
 * @param {string[]} keywords e.g. config.rules.towed
 */
const NEGATIONS = new Set(['not', 'non', 'no', 'never', 'none', 'without', 'un']);

// A value "looks like" a date and/or time when it has a date separator
// (2026-06-01, 06/01/2026) or a clock time (14:30, 2:30). Used by the
// "<datetime>" sentinel so a tow-TIMESTAMP column counts as towed by presence.
const DATETIME_RE = /\d{1,4}[-/.]\d{1,2}([-/.]\d{1,4})?|\d{1,2}:\d{2}/;
export function looksLikeDateTime(raw) {
  const s = String(raw || '').trim();
  return s !== '' && /\d/.test(s) && DATETIME_RE.test(s);
}

/**
 * Sentinel keywords (besides literal words):
 *   "*" / "<any>"   -> any non-empty value matches (presence-based)
 *   "<datetime>"    -> matches when the value is a date/time (e.g. a tow time)
 */
export function classify(value, keywords) {
  if (!value || !Array.isArray(keywords)) return false;
  const raw = String(value).trim().toLowerCase();
  if (raw === '') return false;

  const tokenList = raw.split(/[^a-z0-9]+/).filter(Boolean);
  const rawAlnum = raw.replace(/[^a-z0-9]+/g, '');
  const isNegated = tokenList.length > 0 && NEGATIONS.has(tokenList[0]);

  return keywords.some((k) => {
    const key = String(k).trim().toLowerCase();
    if (key === '') return false;

    // Sentinels
    if (key === '*' || key === '<any>') return !isNegated; // any non-empty, non-negated
    if (key === '<datetime>') return looksLikeDateTime(raw);

    if (raw === key) return true; // exact
    if (/[^a-z0-9]/.test(key)) {
      // multi-word / hyphenated keyword: compare on alphanumerics only
      return rawAlnum.includes(key.replace(/[^a-z0-9]+/g, ''));
    }
    // single word: must appear as a whole token, and NOT be immediately negated
    // ("Not Towed" / "No Tow" -> no match; "No parking - towed" -> match).
    const idx = tokenList.indexOf(key);
    if (idx === -1) return false;
    const prev = idx > 0 ? tokenList[idx - 1] : null;
    return !(prev && NEGATIONS.has(prev));
  });
}

/**
 * Validate that every required logical field maps to a header that actually
 * exists in the CSV. Throws a 422 listing the missing fields.
 */
export function validateMapping(headers, config) {
  const headerSet = new Set(headers.map((h) => h.trim()));
  const required = config.requiredFields || [];
  const missing = required.filter((field) => {
    const header = config.columnMap[field];
    return !header || !headerSet.has(header);
  });

  if (missing.length > 0) {
    throw new MappingError(
      `The CSV is missing columns required by the current mapping: ${missing
        .map((f) => `${f} -> "${config.columnMap[f] || '(unmapped)'}"`)
        .join(', ')}.`,
      'MISSING_COLUMNS',
      { missingFields: missing }
    );
  }
}

/**
 * Validate that the (possibly combined, multi-file) normalized dataset has at
 * least one non-empty value for every required logical field. Unlike
 * validateMapping (single-file, header-based), this evaluates coverage across
 * all rows — so data spread across multiple files counts toward the requirement.
 */
export function validateCoverage(rows, config) {
  const required = config.requiredFields || [];
  const missing = required.filter(
    (field) => !rows.some((r) => String(r[field] ?? '').trim() !== '')
  );

  if (missing.length > 0) {
    throw new MappingError(
      `No uploaded file provided data for required field(s): ${missing.join(', ')}. ` +
        `Map a column to these in the admin panel, or include a CSV that contains them.`,
      'MISSING_COLUMNS',
      { missingFields: missing }
    );
  }
}

/**
 * Map raw rows -> normalized rows. Each normalized row carries the logical
 * fields plus a `_raw` reference for debugging. Amount fields are coerced to
 * numbers; non-numeric amounts are zeroed and tracked in `warnings`.
 *
 * @returns {{ rows: Object[], warnings: string[] }}
 */
export function mapRows(rawRows, config) {
  const { columnMap } = config;
  const warnings = [];
  const amountFields = [
    'amount', 'netRemitAmount', 'refundAmount', 'expenseAmount', 'violationAmount',
    'netTransient', 'netMonthly', 'totalNetRemit',
    'transientReservations', 'monthlyReservations', 'totalReservations',
  ];

  const rows = rawRows.map((raw, index) => {
    const norm = { _row: index + 1 };

    for (const [logical, header] of Object.entries(columnMap)) {
      const value = header != null ? raw[header] : undefined;

      if (amountFields.includes(logical)) {
        const parsed = parseNumber(value);
        if (value != null && String(value).trim() !== '' && Number.isNaN(parsed)) {
          warnings.push(
            `Row ${index + 1}: column "${header}" had a non-numeric value ("${value}") and was treated as 0.`
          );
        }
        norm[logical] = toAmount(value);
      } else {
        norm[logical] = value == null ? '' : String(value).trim();
      }
    }

    norm._raw = raw;
    return norm;
  });

  return { rows, warnings };
}

/**
 * Full mapping pass: validate then normalize.
 */
export function mapCsv(headers, rawRows, config) {
  validateMapping(headers, config);
  return mapRows(rawRows, config);
}
