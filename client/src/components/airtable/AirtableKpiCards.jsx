import { formatCurrency, formatCount } from '../../utils/format.js';
import DeltaBadge from './DeltaBadge.jsx';

const c = (n) => formatCurrency(n, 'USD');

function Card({ label, value, delta, accent = 'text-slate-800' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-xl font-bold ${accent}`}>{value}</p>
      {delta}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{children}</div>
    </section>
  );
}

/**
 * Live KPI grid for the Airtable-backed dashboard. Every card gets a ▲/▼
 * delta badge comparing the selected week against the prior week — pulled
 * straight from Airtable rather than the CSV pipeline.
 */
export default function AirtableKpiCards({ current, previous }) {
  if (!current) return null;
  const f = current.financials;
  const e = current.enforcement;
  const cs = current.customerService;
  const pf = previous?.financials;
  const pe = previous?.enforcement;
  const pcs = previous?.customerService;

  return (
    <div className="space-y-6">
      <Section title="SpotHero &amp; Net Remit">
        <Card
          label="Total Net Remit"
          value={c(f.totalNetRemit)}
          accent="text-emerald-700"
          delta={<DeltaBadge current={f.totalNetRemit} previous={pf?.totalNetRemit} />}
        />
        <Card
          label="Net Transient"
          value={c(f.netTransient)}
          delta={<DeltaBadge current={f.netTransient} previous={pf?.netTransient} />}
        />
        <Card
          label="Net Monthly"
          value={c(f.netMonthly)}
          delta={<DeltaBadge current={f.netMonthly} previous={pf?.netMonthly} />}
        />
        <Card
          label="Total Reservations"
          value={formatCount(f.totalReservations)}
          delta={<DeltaBadge current={f.totalReservations} previous={pf?.totalReservations} />}
        />
        <Card
          label="Transient Reservations"
          value={formatCount(f.transientReservations)}
          delta={<DeltaBadge current={f.transientReservations} previous={pf?.transientReservations} />}
        />
        <Card
          label="Monthly Reservations"
          value={formatCount(f.monthlyReservations)}
          delta={<DeltaBadge current={f.monthlyReservations} previous={pf?.monthlyReservations} />}
        />
        {f.spotHeroMatched === false && (
          <div className="col-span-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            No SpotHero Weekly Remit record matched this date range yet — net remit figures show as $0 until it's added.
          </div>
        )}
      </Section>

      <Section title="Refunds &amp; Expenses">
        <Card
          label="Refunds Processed"
          value={`${formatCount(f.refundsProcessedCount)} · ${c(f.refundsProcessedAmount)}`}
          accent="text-sky-600"
          delta={<DeltaBadge current={f.refundsProcessedAmount} previous={pf?.refundsProcessedAmount} higherIsBetter={false} />}
        />
        <Card
          label="Refunds Pending"
          value={`${formatCount(f.refundsPendingCount)} · ${c(f.refundsPendingAmount)}`}
          accent="text-amber-600"
          delta={<DeltaBadge current={f.refundsPendingAmount} previous={pf?.refundsPendingAmount} higherIsBetter={false} />}
        />
        <Card
          label="Total Expenses"
          value={c(f.totalExpenses)}
          accent="text-rose-600"
          delta={<DeltaBadge current={f.totalExpenses} previous={pf?.totalExpenses} higherIsBetter={false} />}
        />
      </Section>

      <Section title="Enforcement">
        <Card
          label="Illegal Parkers Towed"
          value={formatCount(e.illegalParkersTowed)}
          accent="text-rose-600"
          delta={<DeltaBadge current={e.illegalParkersTowed} previous={pe?.illegalParkersTowed} higherIsBetter={false} />}
        />
        <Card
          label="Violations Encoded"
          value={formatCount(e.violationsEncoded)}
          delta={<DeltaBadge current={e.violationsEncoded} previous={pe?.violationsEncoded} />}
        />
        <Card
          label="Violations Paid"
          value={formatCount(e.violationsPaid)}
          accent="text-emerald-600"
          delta={<DeltaBadge current={e.violationsPaid} previous={pe?.violationsPaid} />}
        />
        <Card
          label="Collection Rate"
          value={`${e.collectionRate.toFixed(1)}%`}
          delta={<DeltaBadge current={e.collectionRate} previous={pe?.collectionRate} suffix=" pts" />}
        />
        <Card
          label="Tow Conversion Rate"
          value={`${e.towConversionRate.toFixed(1)}%`}
          delta={<DeltaBadge current={e.towConversionRate} previous={pe?.towConversionRate} suffix=" pts" />}
        />
      </Section>

      <Section title="Customer Service (RingCentral)">
        <Card
          label="Total Cases"
          value={formatCount(cs.totalCases)}
          accent="text-brand-600"
          delta={<DeltaBadge current={cs.totalCases} previous={pcs?.totalCases} />}
        />
        <Card
          label="Resolution Rate"
          value={`${cs.resolutionRate.toFixed(1)}%`}
          accent="text-emerald-600"
          delta={<DeltaBadge current={cs.resolutionRate} previous={pcs?.resolutionRate} suffix=" pts" />}
        />
        <Card
          label="Avg First Response"
          value={`${cs.avgFRT.toFixed(2)} min`}
          delta={<DeltaBadge current={cs.avgFRT} previous={pcs?.avgFRT} higherIsBetter={false} />}
        />
        <Card
          label="Under 5 Min FRT"
          value={`${cs.under5MinPct.toFixed(1)}%`}
          delta={<DeltaBadge current={cs.under5MinPct} previous={pcs?.under5MinPct} suffix=" pts" />}
        />
      </Section>
    </div>
  );
}
