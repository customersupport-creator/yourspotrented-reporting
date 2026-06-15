import { formatCurrency, formatCount } from '../../utils/format.js';

/**
 * KPI cards across the top of the dashboard. Each card pulls a single headline
 * metric from the report sections.
 */
export default function KpiCards({ report, remit }) {
  if (!report) return null;
  const { sections, meta } = report;
  const currency = meta.currency || 'PHP';
  const c = (n) => formatCurrency(n, currency);

  // Prefer the manually finalized Total Net Remit when the user has entered it.
  const netRemitValue = remit?.hasInput ? remit.totalNetRemit : sections.netRemit.total;

  const cards = [
    { label: 'Illegal Parkers Towed', value: formatCount(sections.highlights.towed), accent: 'text-rose-600' },
    { label: 'Paid on Parkpliant', value: formatCount(sections.highlights.paid), accent: 'text-emerald-600' },
    { label: 'Encoded Violations', value: formatCount(sections.highlights.encoded), accent: 'text-brand-600' },
    { label: 'Net Remittance', value: c(netRemitValue), accent: 'text-emerald-700' },
    { label: 'Refunds Processed', value: formatCount(sections.refunds.processed.count), accent: 'text-sky-600' },
    { label: 'Pending Refunds', value: formatCount(sections.refunds.pending.count), accent: 'text-amber-600' },
    { label: 'Expenses', value: c(sections.expenses.total), accent: 'text-slate-700' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{card.label}</p>
          <p className={`mt-2 text-xl font-bold ${card.accent}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
