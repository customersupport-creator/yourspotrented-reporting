import { createRegistry } from './registry.js';
import highlights from './sections/highlights.js';
import customerService from './sections/customerService.js';
import serviceAnalytics from './sections/serviceAnalytics.js';
import enforcement from './sections/enforcement.js';
import revenue from './sections/revenue.js';
import netRemit from './sections/netRemit.js';
import refunds from './sections/refunds.js';
import expenses from './sections/expenses.js';
import { buildCharts } from './charts.js';
import { TemplateSummaryProvider } from './summary/TemplateSummaryProvider.js';

/**
 * Reporting Engine entry point.
 *
 * Wires the section registry, the chart builder, and the summary provider into
 * one `generateReport(rows, config)` call. Sections are registered in display
 * order; adding a new one is a single `registry.register(...)` line.
 */

const registry = createRegistry([
  highlights,
  customerService,
  serviceAnalytics,
  enforcement,
  revenue,
  netRemit,
  refunds,
  expenses,
]);

// Swap this line to use a different SummaryProvider (e.g. an LLM-backed one).
const summaryProvider = new TemplateSummaryProvider();

export function listSections() {
  return registry.list().map(({ key, title }) => ({ key, title }));
}

/**
 * Per-upload breakdown: group the combined rows by their source file and run the
 * section engine on each group, so every file can be itemized and audited
 * against the combined totals. Customer Service is intentionally omitted here —
 * per the reporting spec it stays a high-level combined summary only.
 */
export function generatePerFileBreakdown(rows, config) {
  const groups = new Map();
  for (const row of rows) {
    const name = row._source || 'unknown';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  }

  const out = [];
  for (const [name, groupRows] of groups) {
    const sections = registry.runAll(groupRows, config);
    delete sections.customerService; // keep CS combined-only
    out.push({
      name,
      rowCount: groupRows.length,
      period: derivePeriod(groupRows),
      sections,
      charts: buildCharts(groupRows, config),
    });
  }
  return out;
}

/**
 * Flatten section results into the metric bag the summary provider consumes.
 * Keeps the provider decoupled from section shapes.
 */
function buildMetrics(sections) {
  return {
    towed: sections.highlights?.towed || 0,
    paid: sections.highlights?.paid || 0,
    encoded: sections.highlights?.encoded || 0,
    csCases: sections.customerService?.caseCount || 0,
    netRemit: sections.netRemit?.total || 0,
    refundsProcessedCount: sections.refunds?.processed?.count || 0,
    refundsProcessedTotal: sections.refunds?.processed?.total || 0,
    refundsPendingCount: sections.refunds?.pending?.count || 0,
    refundsPendingTotal: sections.refunds?.pending?.total || 0,
    expenses: sections.expenses?.total || 0,
  };
}

/** Derive the reporting period from the date column. */
function derivePeriod(rows) {
  const dates = rows
    .map((r) => String(r.date || '').trim())
    .filter(Boolean)
    .map((d) => d.slice(0, 10))
    .sort();
  return { start: dates[0] || null, end: dates[dates.length - 1] || null };
}

/**
 * @param {Object[]} rows   normalized rows (from mapper.mapCsv)
 * @param {Object}   config ReportConfig
 * @param {Object}   [meta] extra meta to merge (e.g. warnings, generatedAt)
 */
export function generateReport(rows, config, meta = {}) {
  const sections = registry.runAll(rows, config);
  const charts = buildCharts(rows, config);
  const metrics = buildMetrics(sections);
  const summary = summaryProvider.generate(metrics, config);

  // --- Refund diagnostics / logging ---------------------------------------
  // Surface refund-ingestion problems early (the refund-grid export uses generic
  // column names, so a mapping slip silently drops the data).
  const refundSourceRows = rows.filter((r) => r._refundSource).length;
  const refundWarnings = [];
  if (refundSourceRows > 0) {
    const r = sections.refunds;
    console.log(
      `[refunds] source rows=${refundSourceRows} | issued=${r.issued} ` +
        `processed=${r.processed.count} pending=${r.pending.count} ` +
        `unclassified=${r.unclassified} total=${r.total}`
    );
    if (r.issued === 0) {
      refundWarnings.push('A refund/reimbursement sheet was uploaded but no refund records were read — check the file format.');
    } else if (r.processed.count + r.pending.count === 0) {
      refundWarnings.push(
        `${refundSourceRows} refund records were detected but none matched a PAID/PENDING status — check the STATUS column mapping.`
      );
    } else if (r.unclassified > 0) {
      refundWarnings.push(`${r.unclassified} refund record(s) had an unrecognized STATUS and were counted as issued only.`);
    }
  }
  const mergedWarnings = [...(meta.warnings || []), ...refundWarnings];

  // Itemize per source file so each upload can be audited against the combined
  // totals. Always an array (length 1 for a single upload).
  const perFileReports = generatePerFileBreakdown(rows, config);

  return {
    meta: {
      rowCount: rows.length,
      period: derivePeriod(rows),
      currency: config.currency || 'PHP',
      ...meta,
      warnings: mergedWarnings,
    },
    sections,
    charts,
    summary,
    perFileReports,
  };
}

export { registry, summaryProvider };
export default generateReport;
