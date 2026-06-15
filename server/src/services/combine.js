import { parseCsv } from './csvParser.js';
import { mapRows } from './mapper.js';
import { autoMapHeaders } from './autoMap.js';

/**
 * Multi-file combine service.
 *
 * Each uploaded CSV is parsed and independently normalized to the logical
 * fields, then all rows are unioned into a single dataset for the reporting
 * engine. Because each file is mapped on its own headers, files that name the
 * same field differently (e.g. "Date" vs "Txn Date") still line up — and a
 * column missing from one file but present in another no longer causes a
 * "not mapped" failure, since coverage is evaluated across the union.
 */

/**
 * Build the effective columnMap for a single file: honor the global mapping
 * where its header exists in this file, and auto-map the rest from this file's
 * own headers.
 */
export function buildEffectiveMap(headers, config) {
  const headerSet = new Set(headers);
  const effective = {};

  for (const [field, header] of Object.entries(config.columnMap || {})) {
    if (header && headerSet.has(header)) effective[field] = header;
  }

  const auto = autoMapHeaders(headers, config.columnMap || {}).columnMap;
  for (const [field, header] of Object.entries(auto)) {
    if (!effective[field] && header) effective[field] = header;
  }
  return effective;
}

/**
 * Optionally merge rows that share the same cross-reference key across files
 * into a single row (later files fill blank fields). `keyField` is a logical
 * field name (e.g. a ticket id mapped via config.columnMap).
 */
function joinByKey(rows, keyField) {
  const byKey = new Map();
  const result = [];
  let mergedCount = 0;

  for (const row of rows) {
    const key = String(row[keyField] ?? '').trim();
    if (key === '') {
      result.push(row);
      continue;
    }
    if (!byKey.has(key)) {
      const copy = { ...row };
      byKey.set(key, copy);
      result.push(copy);
    } else {
      const target = byKey.get(key);
      for (const [k, v] of Object.entries(row)) {
        if (k.startsWith('_')) continue;
        const cur = target[k];
        const curEmpty = cur === '' || cur === 0 || cur == null;
        const incoming = v !== '' && v != null && v !== 0;
        if (curEmpty && incoming) target[k] = v;
      }
      mergedCount += 1;
    }
  }
  return { rows: result, mergedCount };
}

/**
 * @param {{name:string, buffer:Buffer|string}[]} files
 * @param {object} config ReportConfig
 * @returns {{ rows, perFile, warnings, unionHeaders }}
 */
export function combineFiles(files, config) {
  const perFile = [];
  const warnings = [];
  const unionHeaderSet = new Set();
  let combined = [];

  for (const f of files) {
    const { headers, rows, warnings: parseWarnings } = parseCsv(f.buffer);
    headers.forEach((h) => unionHeaderSet.add(h));

    const effectiveMap = buildEffectiveMap(headers, config);
    const fileConfig = { ...config, columnMap: { ...config.columnMap, ...effectiveMap } };
    const { rows: normRows, warnings: mapWarnings } = mapRows(rows, fileConfig);
    // Tag each row with the kind of source file it came from, so each metric can
    // be routed to its authoritative sheet (and ONLY that sheet):
    //  - tow log         -> has a TOWING COMPANY column (towed by license plate)
    //  - Parkpliant sheet -> has a VIOLATION NOTICE NUMBER column (encoded + paid)
    const isTowLog = Boolean(effectiveMap.towingCompany);
    const isParkpliant = Boolean(effectiveMap.violationNotice);
    const isManagementExpense = Boolean(effectiveMap.expensePurpose);
    const isCustomerTracking = Boolean(effectiveMap.csReasonCategory);
    const isRevenue = Boolean(effectiveMap.totalNetRemit || effectiveMap.netTransient);
    normRows.forEach((r) => {
      r._source = f.name;
      r._towLogSource = isTowLog;
      r._parkpliantSource = isParkpliant;
      r._expenseSource = isManagementExpense;
      r._csSource = isCustomerTracking;
      r._revenueSource = isRevenue;
    });
    combined.push(...normRows);

    perFile.push({
      name: f.name,
      rowCount: rows.length,
      headers,
      mappedFields: Object.keys(effectiveMap),
    });

    [...(parseWarnings || []), ...(mapWarnings || [])].forEach((w) => warnings.push(`[${f.name}] ${w}`));
  }

  // Optional cross-reference join.
  const joinKey = config.joinKey;
  if (joinKey && config.columnMap?.[joinKey]) {
    const joined = joinByKey(combined, joinKey);
    combined = joined.rows;
    if (joined.mergedCount > 0) {
      warnings.push(`Cross-referenced ${joined.mergedCount} row(s) by "${joinKey}" across files.`);
    }
  }

  return { rows: combined, perFile, warnings, unionHeaders: [...unionHeaderSet] };
}

export default combineFiles;
