import Papa from 'papaparse';

/**
 * CSV Parsing Module.
 *
 * Wraps PapaParse and performs *structural* validation only (is this a usable
 * CSV with headers and at least one data row?). Semantic validation — whether
 * the mapped columns exist — happens in the mapper, because that depends on the
 * ReportConfig.
 */

export class CsvParseError extends Error {
  constructor(message, code = 'CSV_PARSE_ERROR') {
    super(message);
    this.name = 'CsvParseError';
    this.code = code;
    this.status = 400;
  }
}

/**
 * Parse a CSV buffer/string into { headers, rows }.
 * @param {Buffer|string} input - raw CSV content
 * @returns {{ headers: string[], rows: Object[] }}
 */
export function parseCsv(input) {
  const text = Buffer.isBuffer(input) ? input.toString('utf8') : String(input ?? '');

  if (text.trim() === '') {
    throw new CsvParseError('The uploaded file is empty.', 'EMPTY_FILE');
  }

  // Parse WITHOUT header mode so we control header handling ourselves. PapaParse's
  // header mode silently renames blank/duplicate headers (e.g. trailing commas
  // become "_1", "_2"), which then breaks column mapping. We instead take the
  // first row as headers, drop blank-named columns, and de-duplicate explicitly.
  const result = Papa.parse(text, {
    header: false,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  const fatal = result.errors.filter((e) => e.type === 'Delimiter' || e.code === 'UndetectableDelimiter');
  if (fatal.length > 0) {
    throw new CsvParseError('Could not detect a valid CSV structure.', 'BAD_DELIMITER');
  }

  const matrix = result.data;
  if (!matrix.length) {
    throw new CsvParseError('No column headers were found in the CSV.', 'NO_HEADERS');
  }

  // Skip leading title/period preamble rows (e.g. report exports that put
  // "WEEKLY REVENUE" then "Jun 1-7, 2026" above the real header). The header is
  // the first row with at least two non-blank cells.
  const nonBlank = (row) => row.filter((c) => String(c ?? '').trim() !== '').length;
  let headerIdx = matrix.findIndex((row) => nonBlank(row) >= 2);
  if (headerIdx < 0) headerIdx = 0;
  const dataMatrix = matrix.slice(headerIdx);

  const rawHeaders = dataMatrix[0].map((h) => String(h ?? '').trim());

  // Keep only the column indexes whose header is non-blank and not a duplicate.
  const warnings = [];
  const seen = new Set();
  const duplicates = new Set();
  const keep = []; // { index, name }
  rawHeaders.forEach((name, index) => {
    if (name === '') return; // drop blank-named (usually trailing-comma) columns
    if (seen.has(name)) {
      duplicates.add(name);
      return; // keep only the first occurrence of a duplicate header
    }
    seen.add(name);
    keep.push({ index, name });
  });

  if (keep.length === 0) {
    throw new CsvParseError('No usable column headers were found in the CSV.', 'NO_HEADERS');
  }
  if (duplicates.size > 0) {
    warnings.push(
      `Duplicate column header(s) detected and ignored (kept the first of each): ${[...duplicates].join(', ')}.`
    );
  }

  const headers = keep.map((k) => k.name);

  // Build row objects from only the kept columns.
  const rows = dataMatrix
    .slice(1)
    .map((cells) => {
      const obj = {};
      for (const { index, name } of keep) {
        const v = cells[index];
        obj[name] = v == null ? '' : String(v);
      }
      return obj;
    })
    .filter((row) => Object.values(row).some((v) => String(v).trim() !== ''));

  if (rows.length === 0) {
    throw new CsvParseError('The CSV has headers but no data rows.', 'NO_DATA_ROWS');
  }

  return { headers, rows, warnings };
}

/**
 * Lightweight preview used by the mapping UI: headers + first N rows + count.
 */
export function previewCsv(input, limit = 10) {
  const { headers, rows, warnings } = parseCsv(input);
  return {
    headers,
    rows: rows.slice(0, limit),
    rowCount: rows.length,
    warnings,
  };
}
