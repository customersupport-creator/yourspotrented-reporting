import { formatCurrency, formatCount } from '../utils/format.js';
import { labeledSources } from '../utils/sources.js';

/**
 * Operational breakdown — a polished, management-report view of how the report's
 * figures are composed, grouped by the business area each data source covers.
 *
 * Deliberately free of import-log chrome: no filenames, record counts, date
 * ranges, or "no data" messages. Sources that contribute no reportable metric
 * are simply omitted.
 */
export default function PerFileBreakdown({ report }) {
  const sources = labeledSources(report?.perFileReports || []);
  if (sources.length < 2) return null; // only meaningful as a comparative view

  const currency = report.meta.currency || 'PHP';

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Operational Breakdown
      </h2>

      <SummaryTable report={report} sources={sources} currency={currency} />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sources.map((src) => (
          <SourceCard key={src.label} src={src} currency={currency} />
        ))}
      </div>
    </section>
  );
}

function SummaryTable({ report, sources, currency }) {
  const c = (n) => (n > 0 ? formatCurrency(n, currency) : '—');
  const k = (n) => (n > 0 ? formatCount(n) : '—');
  const cols = ['Towed', 'Paid', 'Encoded', 'Net Remit', 'Expenses'];

  const cells = (s) => [
    k(s.highlights.towed),
    k(s.highlights.paid),
    k(s.highlights.encoded),
    c(s.netRemit.total),
    c(s.expenses.total),
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-2 font-medium">Area</th>
            {cols.map((col) => (
              <th key={col} className="px-4 py-2 text-right font-medium">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sources.map((src) => (
            <tr key={src.label} className="border-b border-slate-50">
              <td className="px-4 py-2 font-medium text-slate-700">{src.label}</td>
              {cells(src.sections).map((v, i) => (
                <td key={i} className="px-4 py-2 text-right text-slate-700">{v}</td>
              ))}
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-800">
            <td className="px-4 py-2">Combined</td>
            {cells(report.sections).map((v, i) => (
              <td key={i} className="px-4 py-2 text-right">{v}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SourceCard({ src, currency }) {
  const c = (n) => formatCurrency(n, currency);
  const s = src.sections;

  const stats = [
    { label: 'Towed', value: formatCount(s.highlights.towed), show: s.highlights.towed > 0 },
    { label: 'Paid', value: formatCount(s.highlights.paid), show: s.highlights.paid > 0 },
    { label: 'Encoded', value: formatCount(s.highlights.encoded), show: s.highlights.encoded > 0 },
    { label: 'Net Remit', value: c(s.netRemit.total), show: s.netRemit.total > 0 },
    {
      label: 'Refunds',
      value: formatCount(s.refunds.processed.count + s.refunds.pending.count),
      show: s.refunds.processed.count + s.refunds.pending.count > 0,
    },
    { label: 'Expenses', value: c(s.expenses.total), show: s.expenses.total > 0 },
  ].filter((x) => x.show);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="mb-4 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-700">{src.label}</p>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{stat.label}</p>
            <p className="mt-1 text-base font-semibold text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {s.expenses.byCategory.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Expense categories</p>
          <div className="flex flex-wrap gap-2">
            {s.expenses.byCategory.map((cat) => (
              <span
                key={cat.category}
                className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600"
              >
                <span className="font-medium text-slate-700">{cat.category}</span>
                <span className="text-slate-400">{cat.tracking ? 'tracking only' : c(cat.amount)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
