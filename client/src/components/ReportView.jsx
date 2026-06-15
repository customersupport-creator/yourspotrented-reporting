import { formatCurrency, formatCount } from '../utils/format.js';
import RemitEntry from './RemitEntry.jsx';

/** Small presentational helpers */
function SectionCard({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

/**
 * Renders the full sectioned report. Each section maps to the engine output.
 */
export default function ReportView({ report, onRemitChange }) {
  if (!report) return null;
  const { sections, meta } = report;
  const currency = meta.currency || 'PHP';
  const c = (n) => formatCurrency(n, currency);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SectionCard title="Highlights / News of the Week">
        <Stat label="Illegal parkers towed" value={formatCount(sections.highlights.towed)} />
        <Stat label="Paid on Parkpliant" value={formatCount(sections.highlights.paid)} />
        <Stat label="Violations encoded in Parkpliant" value={formatCount(sections.highlights.encoded)} />
      </SectionCard>

      <SectionCard title="Customer Service Provided">
        <Stat label="Cases handled" value={formatCount(sections.customerService.caseCount)} />
        {sections.customerService.activities.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {sections.customerService.activities.map((a) => (
              <li key={a.type} className="flex justify-between">
                <span>{a.type}</span>
                <span className="font-medium">{formatCount(a.count)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No customer service activity found.</p>
        )}
      </SectionCard>

      <SectionCard title="Weekly Total Net Remit">
        <RemitEntry currency={currency} csvComputedTotal={sections.netRemit.total} onChange={onRemitChange} />
      </SectionCard>

      <SectionCard title="Refunds / Reimbursements">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase text-slate-400">Approved &amp; Processed</p>
          <Stat label="Count" value={formatCount(sections.refunds.processed.count)} />
          <Stat label="Total amount" value={c(sections.refunds.processed.total)} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Approved but Pending</p>
          <Stat label="Count" value={formatCount(sections.refunds.pending.count)} />
          <Stat label="Total amount" value={c(sections.refunds.pending.total)} />
        </div>
      </SectionCard>

      <SectionCard title="Expenses">
        <Stat label="Total expenses" value={c(sections.expenses.total)} />
        {sections.expenses.table.length > 0 ? (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-400">
                <th className="py-1 font-medium">Category</th>
                <th className="py-1 text-right font-medium">Count</th>
                <th className="py-1 text-right font-medium">Amount</th>
                <th className="py-1 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {sections.expenses.table.map((row) => (
                <tr key={row.category} className="border-b border-slate-50">
                  <td className="py-1.5">
                    {row.category}
                    {row.tracking && (
                      <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">tracking only</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right">{formatCount(row.count)}</td>
                  <td className="py-1.5 text-right">{row.tracking ? '—' : c(row.amount)}</td>
                  <td className="py-1.5 text-right text-slate-500">{row.tracking ? '—' : `${row.percent}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No expenses recorded.</p>
        )}
      </SectionCard>
    </div>
  );
}
