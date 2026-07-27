import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrency, formatCount } from '../../utils/format.js';
import RemitEntry from '../RemitEntry.jsx';
import { KpiCard, KpiGrid, Section, Panel, CollapsiblePanel, SummaryCard, Commentary, InsightCard } from './ExecPrimitives.jsx';
import DeltaBadge from '../airtable/DeltaBadge.jsx';

/**
 * Weekly Operations Executive Dashboard — a presentation-only re-skin of the
 * existing report. It consumes the SAME `report` data and `remit` entry as the
 * classic view; no calculations, filters, or data sources are changed here.
 */

const DONUT = ['#2563eb', '#60a5fa', '#16a34a', '#7c3aed', '#f59e0b', '#ef4444', '#06b6d4', '#64748b', '#cbd5e1'];

const pct = (num, den) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

/** Daily Case Volume bar color: weekend slate, weekday blue, peak day darkest. */
function dayColor(d, all) {
  const wd = String(d.label || '').slice(0, 3);
  if (wd === 'Fri' || wd === 'Sat' || wd === 'Sun') return '#64748b';
  const max = Math.max(...all.map((x) => x.count));
  return d.count === max ? '#1d4ed8' : '#3b82f6';
}

function periodDays(meta) {
  const s = meta?.period?.start;
  const e = meta?.period?.end;
  if (!s || !e) return 7;
  const d = (new Date(e) - new Date(s)) / 86400000 + 1;
  return Number.isFinite(d) && d > 0 ? Math.round(d) : 7;
}

function prettyDate(value) {
  if (!value) return '';
  const s = String(value);
  // Parse a date-only "YYYY-MM-DD" as a LOCAL date so the displayed day doesn't
  // shift back one day in timezones behind UTC (e.g. "2026-06-08" → "June 8").
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ExecutiveDashboard({ report, remit, onRemitChange, shared, previousReport }) {
  if (!report) return null;
  const { sections: s, charts, meta, summary } = report;
  const currency = meta.currency || 'PHP';
  const c = (n) => formatCurrency(n, currency);
  const n = (x) => formatCount(x);

  // Week-over-week ▲/▼ badges — only rendered when a previous week's report
  // was supplied (the CSV flow doesn't pass one, so it renders exactly as
  // before; the live Airtable flow does).
  const ps = previousReport?.sections;
  const pa = ps?.serviceAnalytics;
  const pd = (current, previous, opts) =>
    ps ? <DeltaBadge current={current} previous={previous} {...opts} /> : null;

  const netRemit = remit?.hasInput ? remit.totalNetRemit : s.netRemit.total;
  const encoded = s.highlights.encoded;
  const paid = s.highlights.paid;
  const towed = s.highlights.towed;
  const collectionRate = pct(paid, encoded);
  const towConversion = pct(towed, encoded);
  const days = periodDays(meta);
  const csCases = s.customerService.caseCount;
  // Prefer the analytics' own daily average (based on distinct CS dates) — the
  // report period can span months when other sheets contain historical rows.
  const csPerDay = s.serviceAnalytics
    ? s.serviceAnalytics.dailyAverage
    : days > 0
      ? Math.round((csCases / days) * 10) / 10
      : csCases;
  const refundsTotalCount = s.refunds.processed.count + s.refunds.pending.count;
  const a = s.serviceAnalytics; // null when no Customer Tracking sheet uploaded
  const towLog = s.enforcement?.towLog || [];
  const parkRecords = s.enforcement?.parkpliantRecords || [];
  const refundTx = s.refunds.transactions || [];
  const v = s.revenue; // null when no Weekly Revenue sheet uploaded
  const refundsIssued = s.refunds.processed.count + s.refunds.pending.count;
  const refundRate = v ? pct(refundsIssued, v.totalCount) : 0;
  const composition = v
    ? [
        { name: 'Transient', value: v.transient.revenue },
        { name: 'Monthly', value: v.monthly.revenue },
        { name: 'Enforcement', value: v.enforcementRevenue },
      ]
    : [];
  const volume = v
    ? [
        { name: 'Transient', value: v.transient.count },
        { name: 'Monthly', value: v.monthly.count },
      ]
    : [];
  const refundImpact = v
    ? [
        { name: 'Normal Reservations', value: Math.max(0, v.totalCount - refundsIssued) },
        { name: 'Refunded', value: refundsIssued },
      ]
    : [];

  return (
    <div className="space-y-2">
      {/* Header — navy gradient band */}
      <header
        data-pdf-block
        className="flex flex-wrap items-start justify-between gap-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-7 text-white"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">YourSpot Rented</p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight">Weekly Operations Executive Dashboard</h1>
          <p className="mt-1 text-sm text-slate-300">
            Reporting Period: {prettyDate(meta.period?.start)} – {prettyDate(meta.period?.end)}
          </p>
        </div>
        <span className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200">
          Prepared: {prettyDate(meta.generatedAt)}
        </span>
      </header>

      <div className="pt-4">
        <SummaryCard summary={summary} />
      </div>

      {/* 1 — Executive Overview */}
      <Section index="1" title="Executive Overview">
        {v ? (
          <KpiGrid cols={3}>
            <KpiCard label="Total Net Revenue" tone="blue" value={c(v.totalNet)} sub={`${n(v.totalCount)} total reservations`} />
            <KpiCard label="Transient Revenue" tone="blue" value={c(v.transient.revenue)} sub={`${n(v.transient.count)} reservations • ${v.transient.share}% of revenue`} />
            <KpiCard label="Monthly Revenue" tone="blue" value={c(v.monthly.revenue)} sub={`${n(v.monthly.count)} reservations • ${v.monthly.share}% of revenue`} />
            <KpiCard label="Avg Revenue / Reservation" tone="emerald" value={c(v.avgPerReservation)} sub={`Transient: ${c(v.transient.avg)} • Monthly: ${c(v.monthly.avg)}`} />
            <KpiCard label="Enforcement Revenue" tone="emerald" value={c(v.enforcementRevenue)} sub={`${n(encoded)} violations encoded in Parkpliant`} />
            <KpiCard label="Parkpliant Collections" tone="amber" value={c(v.parkpliantCollections)} sub={`${n(paid)} of ${n(encoded)} paid • ${collectionRate}% collection rate`} />
          </KpiGrid>
        ) : (
          <KpiGrid>
            <KpiCard label="Total Net Remittance" tone="blue" value={c(netRemit)} sub={`${n(s.netRemit.contributingRows || 0)} contributing records`} delta={pd(netRemit, ps?.netRemit.total)} />
            <KpiCard label="Customer Service" tone="violet" value={n(csCases)} sub="interactions handled this week" delta={pd(csCases, ps?.customerService.caseCount)} />
            <KpiCard label="Violations Encoded" tone="slate" value={n(encoded)} sub="logged in Parkpliant" delta={pd(encoded, ps?.highlights.encoded)} />
            <KpiCard label="Paid on Parkpliant" tone="amber" value={n(paid)} sub={`${n(paid)} of ${n(encoded)} • ${collectionRate}% collection rate`} delta={pd(paid, ps?.highlights.paid)} />
            <KpiCard label="Illegal Parkers Towed" tone="emerald" value={n(towed)} sub="vehicles removed" delta={pd(towed, ps?.highlights.towed, { higherIsBetter: false })} />
            <KpiCard label="Total Expenses" tone="slate" value={c(s.expenses.total)} sub="management expenses" delta={pd(s.expenses.total, ps?.expenses.total, { higherIsBetter: false })} />
          </KpiGrid>
        )}
      </Section>

      {/* 2 — Financial Performance */}
      <Section index="2" title="Financial Performance">
        {v ? (
          <>
            <KpiGrid>
              <KpiCard label="Gross Revenue" tone="blue" value={c(v.totalNet)} sub="total net remit this week" />
              <KpiCard label="Refunds Issued" tone="red" value={n(refundsIssued)} sub="cases involving refund/reimbursement" />
              <KpiCard label="Refund Rate" tone="emerald" value={`${refundRate}%`} sub={`${n(refundsIssued)} refunds out of ${n(v.totalCount)} reservations`} />
              <KpiCard label="Monthly Rev Share" tone="slate" value={`${v.monthly.share}%`} sub="recurring revenue portion" />
            </KpiGrid>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="Revenue Composition" empty={!composition.length}>
                <Donut data={composition} nameKey="name" valueKey="value" fmt={(x) => c(x)} />
              </Panel>
              <Panel title="Reservation Volume by Type" empty={!volume.length}>
                <Donut data={volume} nameKey="name" valueKey="value" />
              </Panel>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="Revenue by Segment" empty={!composition.length}>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={composition} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                      <XAxis type="number" fontSize={11} tickFormatter={(x) => c(x)} />
                      <YAxis type="category" dataKey="name" width={90} fontSize={11} />
                      <Tooltip formatter={(x) => c(x)} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {composition.map((_, i) => (
                          <Cell key={i} fill={['#2563eb', '#60a5fa', '#16a34a'][i] || DONUT[i % DONUT.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel title="Refund Impact Analysis" empty={!refundImpact.length}>
                <Donut data={refundImpact} nameKey="name" valueKey="value" colors={['#16a34a', '#ef4444']} />
              </Panel>
            </div>

            <Commentary>
              The week delivered {c(v.totalNet)} in total net revenue across {n(v.totalCount)} reservations, with
              transient bookings accounting for {v.transient.share}% of revenue ({c(v.transient.revenue)}). Monthly
              subscriptions average {c(v.monthly.avg)} per reservation versus {c(v.transient.avg)} for transient.
              Enforcement added {c(v.enforcementRevenue)}; the refund rate was {refundRate}%.
            </Commentary>
          </>
        ) : (
          <>
            <KpiGrid>
              <KpiCard label="Net Remittance" tone="blue" value={c(netRemit)} sub="total net remit this week" delta={pd(netRemit, ps?.netRemit.total)} />
              <KpiCard label="Refunds Processed" tone="emerald" value={n(s.refunds.processed.count)} sub={c(s.refunds.processed.total)} delta={pd(s.refunds.processed.count, ps?.refunds.processed.count)} />
              <KpiCard label="Refunds Pending" tone="amber" value={n(s.refunds.pending.count)} sub={c(s.refunds.pending.total)} delta={pd(s.refunds.pending.count, ps?.refunds.pending.count, { higherIsBetter: false })} />
              <KpiCard label="Total Expenses" tone="slate" value={c(s.expenses.total)} sub={`${n(s.expenses.byCategory.length)} categories`} delta={pd(s.expenses.total, ps?.expenses.total, { higherIsBetter: false })} />
            </KpiGrid>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="Refund Status Breakdown" empty={!charts.refundBreakdown.length}>
                <Donut data={charts.refundBreakdown} nameKey="status" valueKey="count" />
              </Panel>
              <Panel title="Expense Breakdown" empty={!charts.expenseBreakdown.length}>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.expenseBreakdown} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                      <XAxis type="number" fontSize={11} tickFormatter={(x) => c(x)} />
                      <YAxis type="category" dataKey="category" width={120} fontSize={11} />
                      <Tooltip formatter={(x) => c(x)} />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {charts.expenseBreakdown.map((_, i) => (
                          <Cell key={i} fill={DONUT[i % DONUT.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            {!shared && (
              <Panel title="Weekly Total Net Remit (manual entry)">
                <RemitEntry currency={currency} csvComputedTotal={s.netRemit.total} onChange={onRemitChange} />
              </Panel>
            )}

            <Commentary>
              Net remittance reached {c(netRemit)} this week. {n(s.refunds.processed.count)} refunds were processed
              ({c(s.refunds.processed.total)}) with {n(s.refunds.pending.count)} still pending. Operating expenses
              totaled {c(s.expenses.total)}.
            </Commentary>
          </>
        )}

        {/* Refunds Processed — collapsed by default; amount emphasized */}
        <CollapsiblePanel
          title="Refunds Processed"
          metricLabel="Total Refund Amount"
          metric={c(s.refunds.processed.total)}
          sub={`${n(s.refunds.processed.count)} refund${s.refunds.processed.count === 1 ? '' : 's'} processed`}
        >
          {refundTx.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {refundTx.map((t, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="px-3 py-2 text-slate-600">{t.date}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-700">{c(t.amount)}</td>
                      <td className="px-3 py-2 text-slate-600">{t.status}</td>
                      <td className="px-3 py-2 text-slate-600">{t.category}</td>
                      <td className="px-3 py-2 text-slate-600">{t.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No processed refund transactions in the report week.</p>
          )}
        </CollapsiblePanel>
      </Section>

      {/* 3 — Weekly Total Net Remit (SpotHero transient/monthly breakdown) */}
      {s.netRemit.netTransient !== undefined && (
        <Section index="3" title="Weekly Total Net Remit">
          <KpiGrid cols={3}>
            <KpiCard
              label="Net Transient"
              tone="blue"
              value={c(s.netRemit.netTransient)}
              sub={`${n(s.netRemit.transientReservations)} transient reservations`}
              delta={pd(s.netRemit.netTransient, ps?.netRemit.netTransient)}
            />
            <KpiCard
              label="Net Monthly"
              tone="violet"
              value={c(s.netRemit.netMonthly)}
              sub={`${n(s.netRemit.monthlyReservations)} monthly reservations`}
              delta={pd(s.netRemit.netMonthly, ps?.netRemit.netMonthly)}
            />
            <KpiCard
              label="Total Net Remit"
              tone="emerald"
              value={c(s.netRemit.total)}
              sub={`${n(s.netRemit.contributingRows)} total reservations`}
              delta={pd(s.netRemit.total, ps?.netRemit.total)}
            />
          </KpiGrid>
        </Section>
      )}

      {/* 4 — Customer Service Performance */}
      <Section index="4" title="Customer Service Performance">
        {a ? (
          <>
            <KpiGrid cols={3}>
              <KpiCard label="Total Cases" tone="violet" value={n(a.total)} sub="all customer interactions this week" delta={pd(a.total, pa?.total)} />
              <KpiCard label="Resolved" tone="emerald" value={n(a.resolved)} sub={`${a.resolutionRate}% resolution rate`} delta={pd(a.resolutionRate, pa?.resolutionRate, { suffix: ' pts' })} />
              <KpiCard label="Avg First Response" tone="emerald" value={`${a.frt.avg} min`} sub={`${a.frt.instantPct}% answered instantly (0 min)`} delta={pd(a.frt.avg, pa?.frt.avg, { higherIsBetter: false })} />
              <KpiCard label="Under 5 Min FRT" tone="emerald" value={`${a.frt.under5Pct}%`} sub={`${n(a.frt.under5)} of ${n(a.total)} cases`} delta={pd(a.frt.under5Pct, pa?.frt.under5Pct, { suffix: ' pts' })} />
              <KpiCard label="Daily Average" tone="slate" value={n(a.dailyAverage)} sub="cases per day" delta={pd(a.dailyAverage, pa?.dailyAverage)} />
              <KpiCard label="Peak FRT" tone="amber" value={`${n(a.frt.peak)} min`} sub="slowest single case" delta={pd(a.frt.peak, pa?.frt.peak, { higherIsBetter: false })} />
            </KpiGrid>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="Daily Case Volume" empty={!a.dailyVolume.length}>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={a.dailyVolume} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                      <XAxis dataKey="label" fontSize={11} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {a.dailyVolume.map((d, i) => (
                          <Cell key={i} fill={dayColor(d, a.dailyVolume)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel title="Contact Channel Distribution" empty={!a.channels.length}>
                <Donut data={a.channels} nameKey="source" valueKey="count" />
              </Panel>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="Top 10 Contact Reasons" empty={!a.topReasons.length}>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={a.topReasons} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                      <XAxis type="number" fontSize={11} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={170} fontSize={9} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {a.topReasons.map((_, i) => (
                          <Cell key={i} fill={DONUT[i % DONUT.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel title="Resolution Outcomes" empty={!a.outcomes.length}>
                <Donut data={a.outcomes} nameKey="outcome" valueKey="count" />
              </Panel>
            </div>

            <Commentary label="Service Performance Commentary">
              Customer service handled {n(a.total)} interactions with a {a.resolutionRate}% resolution rate and an
              average first response of {a.frt.avg} minutes ({a.frt.instantPct}% answered instantly). Daily volume
              averaged {n(a.dailyAverage)} cases, peaking midweek.
            </Commentary>
          </>
        ) : (
          <Commentary label="Customer Service">
            No customer service tracking data was uploaded for this period.
          </Commentary>
        )}
      </Section>

      {/* 5 — Operations & Enforcement */}
      <Section index="5" title="Operations & Enforcement">
        <KpiGrid>
          <KpiCard label="Illegal Parkers Encoded" tone="slate" value={n(encoded)} sub="logged in Parkpliant this week" delta={pd(encoded, ps?.highlights.encoded)} />
          <KpiCard label="Vehicles Towed" tone="emerald" value={n(towed)} sub="illegal parkers removed" delta={pd(towed, ps?.highlights.towed, { higherIsBetter: false })} />
          <KpiCard label="Tow Conversion Rate" tone="amber" value={`${towConversion}%`} sub={`${n(towed)} towed of ${n(encoded)} encoded`} delta={pd(towConversion, ps && pct(ps.highlights.towed, ps.highlights.encoded), { suffix: ' pts' })} />
          <KpiCard label="Paid on Parkpliant" tone="amber" value={n(paid)} sub={`${collectionRate}% collection rate`} delta={pd(paid, ps?.highlights.paid)} />
        </KpiGrid>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Enforcement Funnel">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { stage: 'Encoded', value: encoded },
                    { stage: 'Paid', value: paid },
                    { stage: 'Towed', value: towed },
                  ]}
                  margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="stage" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {['#64748b', '#16a34a', '#ef4444'].map((color, i) => (
                      <Cell key={i} fill={color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Violations Trend" empty={!charts.violationsTrend.length}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.violationsTrend} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="Encoded" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        {towLog.length > 0 && (
          <Panel title="Tow Activity Log">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">License Plate</th>
                    <th className="px-3 py-2 font-medium">Facility</th>
                    <th className="px-3 py-2 font-medium">Towing Company</th>
                  </tr>
                </thead>
                <tbody>
                  {towLog.map((t, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="px-3 py-2 text-slate-600">{t.date}</td>
                      <td className="px-3 py-2 font-medium text-slate-700">{t.plate}</td>
                      <td className="px-3 py-2 text-slate-600">{t.facility}</td>
                      <td className="px-3 py-2 text-slate-600">{t.company}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Parkpliant Records — collapsible, collapsed by default */}
        {parkRecords.length > 0 && (
          <CollapsiblePanel
            title="Parkpliant Records"
            metricLabel="Violations Encoded"
            metric={n(parkRecords.length)}
            metricTone="slate"
            sub={`${n(paid)} paid • ${collectionRate}% collection rate`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2 font-medium">Notice #</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Facility</th>
                  </tr>
                </thead>
                <tbody>
                  {parkRecords.map((r, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-700">{r.notice}</td>
                      <td className="px-3 py-2 text-slate-600">{r.date}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{c(r.amount)}</td>
                      <td className="px-3 py-2 text-slate-600">{r.status}</td>
                      <td className="px-3 py-2 text-slate-600">{r.facility}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsiblePanel>
        )}

        <Commentary label="Operations Commentary">
          {n(encoded)} violations were encoded into Parkpliant and {n(towed)} vehicles were towed
          ({towConversion}% tow conversion). {n(paid)} of {n(encoded)} encoded violations have been paid
          ({collectionRate}% collection rate).
        </Commentary>
      </Section>

      {/* 6 — Key Performance Indicators */}
      <Section index="6" title="Key Performance Indicators">
        <KpiGrid cols={3}>
          <KpiCard label="Net Remittance" tone="blue" value={c(netRemit)} sub="total net remit this week" delta={pd(netRemit, ps?.netRemit.total)} />
          <KpiCard label="Parkpliant Collection Rate" tone="emerald" value={`${collectionRate}%`} sub={`${n(paid)} of ${n(encoded)} paid`} delta={pd(collectionRate, ps && pct(ps.highlights.paid, ps.highlights.encoded), { suffix: ' pts' })} />
          <KpiCard label="Tow Conversion Rate" tone="amber" value={`${towConversion}%`} sub={`${n(towed)} of ${n(encoded)} encoded`} delta={pd(towConversion, ps && pct(ps.highlights.towed, ps.highlights.encoded), { suffix: ' pts' })} />
          <KpiCard label="CS Cases / Day" tone="violet" value={n(csPerDay)} sub={`${n(csCases)} total interactions`} delta={pd(csPerDay, pa?.dailyAverage)} />
          <KpiCard label="Refunds (Total)" tone="slate" value={n(refundsTotalCount)} sub={`${n(s.refunds.processed.count)} processed • ${n(s.refunds.pending.count)} pending`} delta={pd(refundsTotalCount, ps && ps.refunds.processed.count + ps.refunds.pending.count, { higherIsBetter: false })} />
          <KpiCard label="Total Expenses" tone="slate" value={c(s.expenses.total)} sub="management expenses" delta={pd(s.expenses.total, ps?.expenses.total, { higherIsBetter: false })} />
        </KpiGrid>

        <div className="mt-2">
          <h3 data-pdf-block className="mb-3 text-base font-bold text-slate-800">Anomalies, Risks &amp; Opportunities</h3>
          <div className="space-y-3">
            <Insights
              encoded={encoded}
              paid={paid}
              towed={towed}
              collectionRate={collectionRate}
              pending={s.refunds.pending}
              c={c}
              n={n}
            />
          </div>
        </div>
      </Section>

      <footer data-pdf-block className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
        YourSpot Rented — Weekly Executive Dashboard • Confidential • Prepared for Senior Management
        <br />
        Report generated {prettyDate(meta.generatedAt)} • Data period: {prettyDate(meta.period?.start)} – {prettyDate(meta.period?.end)}
      </footer>
    </div>
  );
}

/** Donut chart with a legend (matches the sample's ring charts). */
function Donut({ data, nameKey, valueKey, colors, fmt }) {
  const palette = colors || DONUT;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={1}>
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip formatter={fmt ? (x) => fmt(x) : undefined} />
          <Legend iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Data-driven insight cards (presentation-level summaries of existing metrics). */
function Insights({ encoded, paid, towed, collectionRate, pending, c, n }) {
  const cards = [];

  if (encoded > 0 && collectionRate < 50) {
    cards.push(
      <InsightCard key="collection" kind="risk" title={`Low Parkpliant Collection Rate (${collectionRate}%)`}>
        Only {n(paid)} of {n(encoded)} encoded violations have been paid. Tightening follow-up on outstanding
        fines represents recoverable revenue.
      </InsightCard>
    );
  }

  if (pending.count > 0) {
    cards.push(
      <InsightCard key="pending" kind="watch" title={`${n(pending.count)} Refunds Pending`}>
        {n(pending.count)} approved refunds ({c(pending.total)}) are awaiting processing — clear these to keep the
        refund backlog low.
      </InsightCard>
    );
  }

  if (towed > 0) {
    cards.push(
      <InsightCard key="enforcement" kind="opportunity" title="Enforcement Recovery">
        {n(towed)} illegal parkers were successfully towed this week. Consistent enforcement supports a supplementary
        recovery stream alongside collections.
      </InsightCard>
    );
  }

  if (!cards.length) {
    cards.push(
      <InsightCard key="none" kind="opportunity" title="Stable Week">
        No outstanding risks were detected from this week&apos;s metrics.
      </InsightCard>
    );
  }

  return cards;
}
