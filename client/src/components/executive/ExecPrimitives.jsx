/**
 * Executive Dashboard UI primitives — presentation only. These render the
 * existing report data in the "Weekly Operations Executive Dashboard" visual
 * style (colored KPI cards, numbered sections, accented summary/commentary,
 * risk/opportunity insight cards). No data/calculations live here.
 */

const TONE = {
  blue: 'text-blue-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-500',
  violet: 'text-violet-600',
  slate: 'text-slate-800',
  red: 'text-red-600',
};

const ACCENT = {
  blue: 'border-t-blue-500',
  emerald: 'border-t-emerald-500',
  amber: 'border-t-amber-500',
  violet: 'border-t-violet-500',
  slate: 'border-t-slate-400',
  red: 'border-t-red-500',
};

/** A single KPI card: colored top-accent, uppercase label, large value, sub-text. */
export function KpiCard({ label, value, sub, tone = 'blue' }) {
  return (
    <div data-pdf-block className={`rounded-xl border border-slate-200 border-t-4 ${ACCENT[tone] || ACCENT.blue} bg-white p-5 shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold leading-tight ${TONE[tone] || TONE.blue}`}>{value}</p>
      {sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}
    </div>
  );
}

/** Responsive KPI grid (2 columns by default, 3 when cols=3). */
export function KpiGrid({ children, cols = 2 }) {
  const c = cols === 3 ? 'lg:grid-cols-3' : 'sm:grid-cols-2';
  return <div className={`grid grid-cols-1 gap-4 ${c}`}>{children}</div>;
}

/** A numbered executive section: small gray index + bold title. */
export function Section({ index, title, children }) {
  return (
    <section className="mt-10">
      <div data-pdf-block className="mb-4 flex items-center gap-3">
        <span className="text-sm font-bold text-slate-300">{index}</span>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** White card wrapper for charts/tables with a bold title. */
export function Panel({ title, children, empty }) {
  return (
    <div data-pdf-block className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {title && <h3 className="mb-4 text-base font-bold text-slate-800">{title}</h3>}
      {empty ? <div className="flex h-56 items-center justify-center text-sm text-slate-400">No data</div> : children}
    </div>
  );
}

/** The accented Executive Summary card. */
export function SummaryCard({ summary }) {
  if (!summary) return null;
  return (
    <div data-pdf-block className="rounded-2xl border border-slate-200 border-l-4 border-l-blue-800 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-blue-900">Executive Summary</h2>
      <p className="leading-relaxed text-slate-700">{summary}</p>
    </div>
  );
}

/** A left-accented management-commentary callout. */
export function Commentary({ label = 'Management Commentary', children }) {
  return (
    <div data-pdf-block className="rounded-xl border-l-4 border-l-slate-300 bg-slate-50 p-5">
      <p className="leading-relaxed text-slate-700">
        <span className="font-semibold text-slate-800">{label}:</span> {children}
      </p>
    </div>
  );
}

const INSIGHT = {
  watch: { tag: 'WATCH ITEM', border: 'border-l-amber-500', text: 'text-amber-600' },
  risk: { tag: 'RISK', border: 'border-l-red-500', text: 'text-red-600' },
  opportunity: { tag: 'OPPORTUNITY', border: 'border-l-emerald-500', text: 'text-emerald-600' },
};

/** Anomalies / Risks / Opportunities card. */
export function InsightCard({ kind = 'risk', title, children }) {
  const c = INSIGHT[kind] || INSIGHT.risk;
  return (
    <div data-pdf-block className={`rounded-xl border border-slate-200 ${c.border} border-l-4 bg-white p-5 shadow-sm`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${c.text}`}>{c.tag}</p>
      <p className="mt-1 font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}
