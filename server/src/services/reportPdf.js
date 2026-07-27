import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer';

const h = React.createElement;

// Disable hyphenation (react-pdf's default word-splitting looks odd on short labels/values).
Font.registerHyphenationCallback((word) => [word]);

const COLORS = {
  navy: '#0f172a',
  navy2: '#1e293b',
  slate: '#64748b',
  slate400: '#94a3b8',
  slate200: '#e2e8f0',
  slate50: '#f8fafc',
  blue: '#2563eb',
  emerald: '#16a34a',
  amber: '#d97706',
  violet: '#7c3aed',
  red: '#dc2626',
  text: '#1e293b',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, color: COLORS.text, fontFamily: 'Helvetica' },
  header: { backgroundColor: COLORS.navy, borderRadius: 8, padding: 18, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: '#94a3b8', fontSize: 8, letterSpacing: 2, marginBottom: 4 },
  h1: { color: COLORS.white, fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  headerSub: { color: '#cbd5e1', fontSize: 9 },
  preparedBadge: { borderWidth: 1, borderColor: '#475569', borderRadius: 4, paddingVertical: 4, paddingHorizontal: 8, alignSelf: 'flex-start' },
  preparedText: { color: '#e2e8f0', fontSize: 8 },

  summaryBox: { borderLeftWidth: 3, borderLeftColor: COLORS.blue, borderWidth: 1, borderColor: COLORS.slate200, borderRadius: 6, padding: 12, marginBottom: 14 },
  summaryTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1e3a8a', marginBottom: 5 },
  summaryText: { fontSize: 9, lineHeight: 1.5, color: '#334155' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  sectionIndex: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#cbd5e1', marginRight: 6 },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: COLORS.navy2 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  kpiCard: { width: '50%', paddingHorizontal: 4, marginBottom: 8 },
  kpiCard3: { width: '33.33%', paddingHorizontal: 4, marginBottom: 8 },
  kpiInner: { borderWidth: 1, borderColor: COLORS.slate200, borderTopWidth: 3, borderRadius: 5, padding: 9 },
  kpiLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#64748b', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  kpiValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  kpiSub: { fontSize: 7.5, color: '#94a3b8' },
  kpiDelta: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', marginTop: 2 },

  panel: { borderWidth: 1, borderColor: COLORS.slate200, borderRadius: 6, padding: 10, marginBottom: 10 },
  panelTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: COLORS.navy2, marginBottom: 8 },

  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  barLabel: { width: 130, fontSize: 7.5, color: '#475569' },
  barTrack: { flex: 1, height: 9, backgroundColor: '#f1f5f9', borderRadius: 2, marginHorizontal: 6, overflow: 'hidden' },
  barFill: { height: 9, borderRadius: 2 },
  barValue: { width: 44, fontSize: 7.5, color: '#334155', textAlign: 'right' },

  table: { borderWidth: 1, borderColor: COLORS.slate200, borderRadius: 4 },
  tHeadRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: COLORS.slate200 },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#64748b', padding: 5, textTransform: 'uppercase' },
  td: { fontSize: 7.5, color: '#334155', padding: 5 },

  commentary: { backgroundColor: '#f8fafc', borderLeftWidth: 3, borderLeftColor: '#cbd5e1', borderRadius: 4, padding: 10, marginBottom: 6 },
  commentaryText: { fontSize: 8.5, lineHeight: 1.5, color: '#334155' },
  commentaryLabel: { fontFamily: 'Helvetica-Bold', color: '#1e293b' },

  insight: { borderWidth: 1, borderColor: COLORS.slate200, borderLeftWidth: 3, borderRadius: 5, padding: 9, marginBottom: 6 },
  insightTag: { fontSize: 7, fontFamily: 'Helvetica-Bold', marginBottom: 3, textTransform: 'uppercase' },
  insightTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e293b', marginBottom: 2 },
  insightBody: { fontSize: 8, color: '#475569', lineHeight: 1.4 },

  footer: { marginTop: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.slate200, textAlign: 'center' },
  footerText: { fontSize: 7.5, color: '#94a3b8' },
});

const money = (n) =>
  `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const count = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

function prettyDate(value) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function shortDate(value) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/** ▲/▼ delta text + color, or null when there's no comparable prior value. */
function delta(current, previous, { higherIsBetter = true, suffix = '%', isPoints = false } = {}) {
  if (previous === undefined || previous === null || (previous === 0 && !isPoints)) return null;
  if (current === undefined || current === null) return null;
  const diff = current - previous;
  const magnitude = isPoints ? Math.abs(diff) : Math.abs((diff / Math.abs(previous || 1)) * 100);
  const isFlat = magnitude < 0.05;
  const isUp = diff > 0;
  const isGood = isFlat ? null : higherIsBetter ? isUp : !isUp;
  const color = isFlat ? COLORS.slate400 : isGood ? COLORS.emerald : COLORS.red;
  // Helvetica (the built-in PDF standard font) can't render ▲/▼/▬ glyphs — use
  // plain ASCII so the symbol doesn't come out garbled in the rendered PDF.
  const arrow = isFlat ? '=' : isUp ? '^' : 'v';
  return { text: `${arrow} ${magnitude.toFixed(1)}${suffix} vs last week`, color };
}

function KpiCard({ label, value, sub, color = COLORS.blue, deltaInfo, wide }) {
  return h(
    View,
    { style: wide ? styles.kpiCard3 : styles.kpiCard },
    h(
      View,
      { style: [styles.kpiInner, { borderTopColor: color }] },
      h(Text, { style: styles.kpiLabel }, label),
      h(Text, { style: [styles.kpiValue, { color }] }, value),
      sub ? h(Text, { style: styles.kpiSub }, sub) : null,
      deltaInfo ? h(Text, { style: [styles.kpiDelta, { color: deltaInfo.color }] }, deltaInfo.text) : null
    )
  );
}

function SectionHeader({ index, title }) {
  return h(
    View,
    { style: styles.sectionHeader },
    h(Text, { style: styles.sectionIndex }, String(index)),
    h(Text, { style: styles.sectionTitle }, title)
  );
}

/** Simple horizontal-bar breakdown panel (stands in for a donut/bar chart). */
function BarPanel({ title, items, color = COLORS.blue, fmt = count }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return h(
    View,
    { style: styles.panel },
    h(Text, { style: styles.panelTitle }, title),
    items.length === 0
      ? h(Text, { style: { fontSize: 8, color: '#94a3b8' } }, 'No data')
      : items.map((item, i) =>
          h(
            View,
            { style: styles.barRow, key: i },
            h(Text, { style: styles.barLabel }, item.label),
            h(
              View,
              { style: styles.barTrack },
              h(View, { style: [styles.barFill, { width: `${Math.max(2, (item.value / max) * 100)}%`, backgroundColor: item.color || color }] })
            ),
            h(Text, { style: styles.barValue }, fmt(item.value))
          )
        )
  );
}

function DataTable({ columns, rows }) {
  return h(
    View,
    { style: styles.table },
    h(
      View,
      { style: styles.tHeadRow },
      columns.map((c, i) => h(Text, { style: [styles.th, { width: c.width }], key: i }, c.label))
    ),
    rows.map((row, ri) =>
      h(
        View,
        { style: styles.tRow, key: ri },
        columns.map((c, ci) => h(Text, { style: [styles.td, { width: c.width }], key: ci }, String(row[c.key] ?? '')))
      )
    )
  );
}

function Commentary({ label = 'Management Commentary', children }) {
  return h(
    View,
    { style: styles.commentary },
    h(Text, { style: styles.commentaryText }, h(Text, { style: styles.commentaryLabel }, `${label}: `), children)
  );
}

const INSIGHT_STYLE = {
  risk: { border: COLORS.red, tag: COLORS.red, label: 'RISK' },
  watch: { border: COLORS.amber, tag: COLORS.amber, label: 'WATCH ITEM' },
  opportunity: { border: COLORS.emerald, tag: COLORS.emerald, label: 'OPPORTUNITY' },
};

function InsightCard({ kind, title, children }) {
  const st = INSIGHT_STYLE[kind] || INSIGHT_STYLE.risk;
  return h(
    View,
    { style: [styles.insight, { borderLeftColor: st.border }] },
    h(Text, { style: [styles.insightTag, { color: st.tag }] }, st.label),
    h(Text, { style: styles.insightTitle }, title),
    h(Text, { style: styles.insightBody }, children)
  );
}

function pct(num, den) {
  return den > 0 ? Math.round((num / den) * 1000) / 10 : 0;
}

function buildSummaryText(week) {
  const f = week.financials;
  const e = week.enforcement;
  const cs = week.customerService;
  return (
    `This week, ${count(e.illegalParkersTowed)} illegal parker${e.illegalParkersTowed === 1 ? '' : 's'} ` +
    `${e.illegalParkersTowed === 1 ? 'was' : 'were'} towed. A total of ${count(e.violationsEncoded)} violation` +
    `${e.violationsEncoded === 1 ? '' : 's'} ${e.violationsEncoded === 1 ? 'was' : 'were'} encoded into Parkpliant. ` +
    `Customer service handled ${count(cs.totalCases)} inquiries. Net remittance reached ${money(f.totalNetRemit)}. ` +
    `${count(f.refundsProcessedCount)} refund${f.refundsProcessedCount === 1 ? '' : 's'} ` +
    `${f.refundsProcessedCount === 1 ? 'was' : 'were'} approved and processed. Total operating expenses amounted to ${money(f.totalExpenses)}.`
  );
}

function Insights({ encoded, paid, towed, collectionRate, pending }) {
  const cards = [];
  if (encoded > 0 && collectionRate < 50) {
    cards.push(
      h(InsightCard, { key: 'c', kind: 'risk', title: `Low Parkpliant Collection Rate (${collectionRate}%)` },
        `Only ${count(paid)} of ${count(encoded)} encoded violations have been paid. Tightening follow-up on outstanding fines represents recoverable revenue.`)
    );
  }
  if (pending.count > 0) {
    cards.push(
      h(InsightCard, { key: 'p', kind: 'watch', title: `${count(pending.count)} Refunds Pending` },
        `${count(pending.count)} approved refunds (${money(pending.total)}) are awaiting processing — clear these to keep the refund backlog low.`)
    );
  }
  if (towed > 0) {
    cards.push(
      h(InsightCard, { key: 't', kind: 'opportunity', title: 'Enforcement Recovery' },
        `${count(towed)} illegal parkers were successfully towed this week. Consistent enforcement supports a supplementary recovery stream alongside collections.`)
    );
  }
  if (cards.length === 0) {
    cards.push(h(InsightCard, { key: 'n', kind: 'opportunity', title: 'Stable Week' }, "No outstanding risks were detected from this week's metrics."));
  }
  return cards;
}

/** Builds the full multi-page report document (React element tree, no JSX). */
function ReportDocument({ week, previous }) {
  const f = week.financials;
  const e = week.enforcement;
  const cs = week.customerService;
  const pf = previous?.financials;
  const pe = previous?.enforcement;
  const pcs = previous?.customerService;

  const collectionRate = pct(e.violationsPaid, e.violationsEncoded);
  const towConversion = pct(e.illegalParkersTowed, e.violationsEncoded);
  const pCollectionRate = pe ? pct(pe.violationsPaid, pe.violationsEncoded) : undefined;
  const pTowConversion = pe ? pct(pe.illegalParkersTowed, pe.violationsEncoded) : undefined;

  const expenseItems = Object.entries(f.expenseByCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({ label: category, value: amount, color: COLORS.blue }));

  const refundStatusItems = [
    { label: 'Processed', value: f.refundsProcessedCount, color: COLORS.emerald },
    { label: 'Pending', value: f.refundsPendingCount, color: COLORS.amber },
  ].filter((i) => i.value > 0);

  const dailyVolumeItems = Object.entries(cs.dailyVolume)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, n]) => ({ label: shortDate(date), value: n, color: COLORS.blue }));

  const channelItems = Object.entries(cs.channelDist).map(([source, n]) => ({ label: source, value: n, color: COLORS.violet }));
  const topReasonsItems = cs.topReasons.slice(0, 10).map((r) => ({ label: r.reason, value: r.count, color: COLORS.blue }));
  const outcomeItems = Object.entries(cs.outcomeCount).map(([o, n]) => ({ label: o, value: n, color: COLORS.emerald }));

  const enforcementFunnelItems = [
    { label: 'Encoded', value: e.violationsEncoded, color: COLORS.slate },
    { label: 'Paid', value: e.violationsPaid, color: COLORS.emerald },
    { label: 'Towed', value: e.illegalParkersTowed, color: COLORS.red },
  ];

  const byDay = {};
  e.parkpliantLog.forEach((p) => {
    const day = String(p.date || '').slice(0, 10);
    if (day) byDay[day] = (byDay[day] || 0) + 1;
  });
  const violationsTrendItems = Object.entries(byDay)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, n]) => ({ label: shortDate(day), value: n, color: COLORS.blue }));

  const towRows = e.towLog.slice(0, 15).map((t) => ({
    date: shortDate(t.date),
    plate: t.licensePlate || '',
    facility: t.facility || '',
    company: t.towingCompany || '',
  }));

  const parkRows = e.parkpliantLog.slice(0, 15).map((p) => ({
    notice: p.noticeNumber || '',
    date: shortDate(p.date),
    amount: money(p.amount),
    status: p.status || '',
    facility: p.facility || '',
  }));

  const refundRows = f.refundRows.slice(0, 20).map((r) => ({
    date: shortDate(r.date),
    amount: money(r.amount),
    status: r.status || '',
    category: r.category || '',
    reason: r.reason || '',
  }));

  const refundsTotalCount = f.refundsProcessedCount + f.refundsPendingCount;
  const pRefundsTotalCount = pf ? pf.refundsProcessedCount + pf.refundsPendingCount : undefined;

  return h(
    Document,
    { title: `YourSpotRented Weekly Report — ${week.weekStart} to ${week.weekEnd}` },
    h(
      Page,
      { size: 'A4', style: styles.page, wrap: true },

      // Header
      h(
        View,
        { style: styles.header },
        h(
          View,
          null,
          h(Text, { style: styles.eyebrow }, 'YOURSPOT RENTED'),
          h(Text, { style: styles.h1 }, 'Weekly Operations Executive Dashboard'),
          h(Text, { style: styles.headerSub }, `Reporting Period: ${prettyDate(week.weekStart)} – ${prettyDate(week.weekEnd)}`)
        ),
        h(View, { style: styles.preparedBadge }, h(Text, { style: styles.preparedText }, `Prepared: ${prettyDate(new Date().toISOString())}`))
      ),

      // Executive Summary
      h(
        View,
        { style: styles.summaryBox },
        h(Text, { style: styles.summaryTitle }, 'Executive Summary'),
        h(Text, { style: styles.summaryText }, buildSummaryText(week))
      ),

      // 1 — Executive Overview
      h(SectionHeader, { index: 1, title: 'Executive Overview' }),
      h(
        View,
        { style: styles.kpiGrid },
        h(KpiCard, { label: 'Total Net Remittance', value: money(f.totalNetRemit), sub: `${count(f.totalReservations)} contributing records`, color: COLORS.blue, deltaInfo: delta(f.totalNetRemit, pf?.totalNetRemit) }),
        h(KpiCard, { label: 'Customer Service', value: count(cs.totalCases), sub: 'interactions handled this week', color: COLORS.violet, deltaInfo: delta(cs.totalCases, pcs?.totalCases) }),
        h(KpiCard, { label: 'Violations Encoded', value: count(e.violationsEncoded), sub: 'logged in Parkpliant', color: COLORS.slate, deltaInfo: delta(e.violationsEncoded, pe?.violationsEncoded) }),
        h(KpiCard, { label: 'Paid on Parkpliant', value: count(e.violationsPaid), sub: `${count(e.violationsPaid)} of ${count(e.violationsEncoded)} • ${collectionRate}% collection rate`, color: COLORS.amber, deltaInfo: delta(e.violationsPaid, pe?.violationsPaid) }),
        h(KpiCard, { label: 'Illegal Parkers Towed', value: count(e.illegalParkersTowed), sub: 'vehicles removed', color: COLORS.emerald, deltaInfo: delta(e.illegalParkersTowed, pe?.illegalParkersTowed, { higherIsBetter: false }) }),
        h(KpiCard, { label: 'Total Expenses', value: money(f.totalExpenses), sub: 'management expenses', color: COLORS.slate, deltaInfo: delta(f.totalExpenses, pf?.totalExpenses, { higherIsBetter: false }) })
      ),

      // 2 — Financial Performance
      h(SectionHeader, { index: 2, title: 'Financial Performance' }),
      h(
        View,
        { style: styles.kpiGrid },
        h(KpiCard, { label: 'Net Remittance', value: money(f.totalNetRemit), sub: 'total net remit this week', color: COLORS.blue, deltaInfo: delta(f.totalNetRemit, pf?.totalNetRemit) }),
        h(KpiCard, { label: 'Refunds Processed', value: count(f.refundsProcessedCount), sub: money(f.refundsProcessedAmount), color: COLORS.emerald, deltaInfo: delta(f.refundsProcessedCount, pf?.refundsProcessedCount) }),
        h(KpiCard, { label: 'Refunds Pending', value: count(f.refundsPendingCount), sub: money(f.refundsPendingAmount), color: COLORS.amber, deltaInfo: delta(f.refundsPendingCount, pf?.refundsPendingCount, { higherIsBetter: false }) }),
        h(KpiCard, { label: 'Total Expenses', value: money(f.totalExpenses), sub: `${Object.keys(f.expenseByCategory).length} categories`, color: COLORS.slate, deltaInfo: delta(f.totalExpenses, pf?.totalExpenses, { higherIsBetter: false }) })
      ),
      h(BarPanel, { title: 'Refund Status Breakdown', items: refundStatusItems }),
      h(BarPanel, { title: 'Expense Breakdown', items: expenseItems, fmt: money }),
      h(Commentary, null,
        `Net remittance reached ${money(f.totalNetRemit)} this week. ${count(f.refundsProcessedCount)} refunds were processed ` +
        `(${money(f.refundsProcessedAmount)}) with ${count(f.refundsPendingCount)} still pending. Operating expenses totaled ${money(f.totalExpenses)}.`
      ),
      h(
        View,
        { style: styles.panel },
        h(Text, { style: styles.panelTitle }, `Refunds Processed — Total ${money(f.refundsProcessedAmount)} (${count(f.refundsProcessedCount)} refunds)`),
        refundRows.length
          ? h(DataTable, {
              columns: [
                { key: 'date', label: 'Date', width: '18%' },
                { key: 'amount', label: 'Amount', width: '17%' },
                { key: 'status', label: 'Status', width: '20%' },
                { key: 'category', label: 'Category', width: '20%' },
                { key: 'reason', label: 'Reason', width: '25%' },
              ],
              rows: refundRows,
            })
          : h(Text, { style: { fontSize: 8, color: '#94a3b8' } }, 'No refund transactions in this period.')
      ),

      // 3 — Weekly Total Net Remit (SpotHero transient/monthly breakdown)
      h(SectionHeader, { index: 3, title: 'Weekly Total Net Remit' }),
      h(
        View,
        { style: styles.kpiGrid },
        h(KpiCard, { wide: true, label: 'Net Transient', value: money(f.netTransient), sub: `${count(f.transientReservations)} transient reservations`, color: COLORS.blue, deltaInfo: delta(f.netTransient, pf?.netTransient) }),
        h(KpiCard, { wide: true, label: 'Net Monthly', value: money(f.netMonthly), sub: `${count(f.monthlyReservations)} monthly reservations`, color: COLORS.violet, deltaInfo: delta(f.netMonthly, pf?.netMonthly) }),
        h(KpiCard, { wide: true, label: 'Total Net Remit', value: money(f.totalNetRemit), sub: `${count(f.totalReservations)} total reservations`, color: COLORS.emerald, deltaInfo: delta(f.totalNetRemit, pf?.totalNetRemit) })
      ),

      // 4 — Customer Service Performance
      h(SectionHeader, { index: 4, title: 'Customer Service Performance' }),
      h(
        View,
        { style: styles.kpiGrid },
        h(KpiCard, { wide: true, label: 'Total Cases', value: count(cs.totalCases), sub: 'all customer interactions this week', color: COLORS.violet, deltaInfo: delta(cs.totalCases, pcs?.totalCases) }),
        h(KpiCard, { wide: true, label: 'Resolved', value: count(cs.resolved), sub: `${cs.resolutionRate.toFixed(1)}% resolution rate`, color: COLORS.emerald, deltaInfo: delta(cs.resolutionRate, pcs?.resolutionRate, { isPoints: true, suffix: ' pts' }) }),
        h(KpiCard, { wide: true, label: 'Avg First Response', value: `${cs.avgFRT.toFixed(2)} min`, sub: `${cs.instantPct.toFixed(1)}% answered instantly`, color: COLORS.emerald, deltaInfo: delta(cs.avgFRT, pcs?.avgFRT, { higherIsBetter: false }) }),
        h(KpiCard, { wide: true, label: 'Under 5 Min FRT', value: `${cs.under5MinPct.toFixed(1)}%`, sub: `${count(cs.under5MinFRT)} of ${count(cs.totalCases)} cases`, color: COLORS.emerald, deltaInfo: delta(cs.under5MinPct, pcs?.under5MinPct, { isPoints: true, suffix: ' pts' }) }),
        h(KpiCard, { wide: true, label: 'Daily Average', value: count(cs.dailyAverage), sub: 'cases per day', color: COLORS.slate, deltaInfo: delta(cs.dailyAverage, pcs?.dailyAverage) }),
        h(KpiCard, { wide: true, label: 'Peak FRT', value: `${count(cs.peakFRT)} min`, sub: 'slowest single case', color: COLORS.amber, deltaInfo: delta(cs.peakFRT, pcs?.peakFRT, { higherIsBetter: false }) })
      ),
      h(BarPanel, { title: 'Daily Case Volume', items: dailyVolumeItems }),
      h(BarPanel, { title: 'Contact Channel Distribution', items: channelItems, color: COLORS.violet }),
      h(BarPanel, { title: 'Top Contact Reasons', items: topReasonsItems }),
      h(BarPanel, { title: 'Resolution Outcomes', items: outcomeItems, color: COLORS.emerald }),
      h(Commentary, { label: 'Service Performance Commentary' },
        `Customer service handled ${count(cs.totalCases)} interactions with a ${cs.resolutionRate.toFixed(1)}% resolution rate and an ` +
        `average first response of ${cs.avgFRT.toFixed(2)} minutes (${cs.instantPct.toFixed(1)}% answered instantly). Daily volume averaged ${count(cs.dailyAverage)} cases.`
      ),

      // 5 — Operations & Enforcement
      h(SectionHeader, { index: 5, title: 'Operations & Enforcement' }),
      h(
        View,
        { style: styles.kpiGrid },
        h(KpiCard, { label: 'Illegal Parkers Encoded', value: count(e.violationsEncoded), sub: 'logged in Parkpliant this week', color: COLORS.slate, deltaInfo: delta(e.violationsEncoded, pe?.violationsEncoded) }),
        h(KpiCard, { label: 'Vehicles Towed', value: count(e.illegalParkersTowed), sub: 'illegal parkers removed', color: COLORS.emerald, deltaInfo: delta(e.illegalParkersTowed, pe?.illegalParkersTowed, { higherIsBetter: false }) }),
        h(KpiCard, { label: 'Tow Conversion Rate', value: `${towConversion}%`, sub: `${count(e.illegalParkersTowed)} towed of ${count(e.violationsEncoded)} encoded`, color: COLORS.amber, deltaInfo: delta(towConversion, pTowConversion, { isPoints: true, suffix: ' pts' }) }),
        h(KpiCard, { label: 'Paid on Parkpliant', value: count(e.violationsPaid), sub: `${collectionRate}% collection rate`, color: COLORS.amber, deltaInfo: delta(e.violationsPaid, pe?.violationsPaid) })
      ),
      h(BarPanel, { title: 'Enforcement Funnel', items: enforcementFunnelItems }),
      h(BarPanel, { title: 'Violations Trend (by day encoded)', items: violationsTrendItems }),
      h(
        View,
        { style: styles.panel },
        h(Text, { style: styles.panelTitle }, 'Tow Activity Log'),
        towRows.length
          ? h(DataTable, {
              columns: [
                { key: 'date', label: 'Date', width: '15%' },
                { key: 'plate', label: 'License Plate', width: '20%' },
                { key: 'facility', label: 'Facility', width: '40%' },
                { key: 'company', label: 'Towing Company', width: '25%' },
              ],
              rows: towRows,
            })
          : h(Text, { style: { fontSize: 8, color: '#94a3b8' } }, 'No tows logged in this period.')
      ),
      h(
        View,
        { style: styles.panel },
        h(Text, { style: styles.panelTitle }, `Parkpliant Records — ${count(e.violationsEncoded)} encoded • ${collectionRate}% collection rate`),
        parkRows.length
          ? h(DataTable, {
              columns: [
                { key: 'notice', label: 'Notice #', width: '18%' },
                { key: 'date', label: 'Date', width: '22%' },
                { key: 'amount', label: 'Amount', width: '15%' },
                { key: 'status', label: 'Status', width: '15%' },
                { key: 'facility', label: 'Facility', width: '30%' },
              ],
              rows: parkRows,
            })
          : h(Text, { style: { fontSize: 8, color: '#94a3b8' } }, 'No Parkpliant records in this period.')
      ),
      h(Commentary, { label: 'Operations Commentary' },
        `${count(e.violationsEncoded)} violations were encoded into Parkpliant and ${count(e.illegalParkersTowed)} vehicles were towed ` +
        `(${towConversion}% tow conversion). ${count(e.violationsPaid)} of ${count(e.violationsEncoded)} encoded violations have been paid (${collectionRate}% collection rate).`
      ),

      // 6 — Key Performance Indicators
      h(SectionHeader, { index: 6, title: 'Key Performance Indicators' }),
      h(
        View,
        { style: styles.kpiGrid },
        h(KpiCard, { wide: true, label: 'Net Remittance', value: money(f.totalNetRemit), sub: 'total net remit this week', color: COLORS.blue, deltaInfo: delta(f.totalNetRemit, pf?.totalNetRemit) }),
        h(KpiCard, { wide: true, label: 'Parkpliant Collection Rate', value: `${collectionRate}%`, sub: `${count(e.violationsPaid)} of ${count(e.violationsEncoded)} paid`, color: COLORS.emerald, deltaInfo: delta(collectionRate, pCollectionRate, { isPoints: true, suffix: ' pts' }) }),
        h(KpiCard, { wide: true, label: 'Tow Conversion Rate', value: `${towConversion}%`, sub: `${count(e.illegalParkersTowed)} of ${count(e.violationsEncoded)} encoded`, color: COLORS.amber, deltaInfo: delta(towConversion, pTowConversion, { isPoints: true, suffix: ' pts' }) }),
        h(KpiCard, { wide: true, label: 'CS Cases / Day', value: count(cs.dailyAverage), sub: `${count(cs.totalCases)} total interactions`, color: COLORS.violet, deltaInfo: delta(cs.dailyAverage, pcs?.dailyAverage) }),
        h(KpiCard, { wide: true, label: 'Refunds (Total)', value: count(refundsTotalCount), sub: `${count(f.refundsProcessedCount)} processed • ${count(f.refundsPendingCount)} pending`, color: COLORS.slate, deltaInfo: delta(refundsTotalCount, pRefundsTotalCount, { higherIsBetter: false }) }),
        h(KpiCard, { wide: true, label: 'Total Expenses', value: money(f.totalExpenses), sub: 'management expenses', color: COLORS.slate, deltaInfo: delta(f.totalExpenses, pf?.totalExpenses, { higherIsBetter: false }) })
      ),
      h(Text, { style: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1e293b', marginTop: 8, marginBottom: 6 } }, 'Anomalies, Risks & Opportunities'),
      ...Insights({ encoded: e.violationsEncoded, paid: e.violationsPaid, towed: e.illegalParkersTowed, collectionRate, pending: f.refundsPendingCount ? { count: f.refundsPendingCount, total: f.refundsPendingAmount } : { count: 0, total: 0 } }),

      h(
        View,
        { style: styles.footer, fixed: false },
        h(Text, { style: styles.footerText }, 'YourSpot Rented — Weekly Executive Dashboard • Confidential • Prepared for Senior Management'),
        h(Text, { style: styles.footerText }, `Report generated ${prettyDate(new Date().toISOString())} • Data period: ${prettyDate(week.weekStart)} – ${prettyDate(week.weekEnd)}`)
      )
    )
  );
}

/** Renders the weekly report PDF and returns a Buffer. */
export async function renderReportPdf(week, previous) {
  const doc = h(ReportDocument, { week, previous });
  return renderToBuffer(doc);
}
