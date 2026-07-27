/**
 * Adapts the live Airtable week payload (server/src/services/airtableService.js
 * getWeekData shape) into the `report` shape the Executive Dashboard expects
 * (the same shape the CSV pipeline produces). This lets the Airtable-backed
 * "Live" view reuse the exact executive presentation — charts, sections,
 * commentary, insight cards — with no duplicated UI.
 */

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayLabel(dateStr) {
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${WEEKDAY[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

function shortDate(dateStr) {
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/** Formats an Airtable date or datetime string as "7/13/2026" or "7/13/2026 6:06pm". */
function shortDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return shortDate(value);
  const datePart = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  const hasTime = /T\d{2}:\d{2}/.test(String(value));
  if (!hasTime) return datePart;
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${datePart} ${hours}:${minutes}${ampm}`;
}

function round1(n) {
  return Math.round((n || 0) * 10) / 10;
}

function buildSummary(week) {
  const f = week.financials;
  const e = week.enforcement;
  const cs = week.customerService;
  return (
    `This week, ${e.illegalParkersTowed} illegal parker${e.illegalParkersTowed === 1 ? '' : 's'} ` +
    `${e.illegalParkersTowed === 1 ? 'was' : 'were'} towed. A total of ${e.violationsEncoded} violation` +
    `${e.violationsEncoded === 1 ? '' : 's'} ${e.violationsEncoded === 1 ? 'was' : 'were'} encoded into Parkpliant. ` +
    `Customer service handled ${cs.totalCases} inquiries. Net remittance reached $${f.totalNetRemit.toLocaleString()}. ` +
    `${f.refundsProcessedCount} refund${f.refundsProcessedCount === 1 ? '' : 's'} ${f.refundsProcessedCount === 1 ? 'was' : 'were'} ` +
    `approved and processed. Total operating expenses amounted to $${f.totalExpenses.toFixed(2)}.`
  );
}

function toSections(week) {
  const f = week.financials;
  const e = week.enforcement;
  const cs = week.customerService;

  const dailyVolumeEntries = Object.entries(cs.dailyVolume).sort(([a], [b]) => (a < b ? -1 : 1));

  const expensesTotal = f.totalExpenses;
  const expensesByCategory = Object.entries(f.expenseByCategory).map(([category, amount]) => ({
    category,
    count: 0, // per-row counts aren't returned by the Airtable summary endpoint
    amount,
    percent: expensesTotal > 0 ? Math.round((amount / expensesTotal) * 1000) / 10 : 0,
  }));

  return {
    revenue: null, // no platform-composition breakdown for SpotHero-sourced remit
    netRemit: {
      total: f.totalNetRemit,
      contributingRows: f.totalReservations,
      netTransient: f.netTransient,
      transientReservations: f.transientReservations,
      netMonthly: f.netMonthly,
      monthlyReservations: f.monthlyReservations,
    },
    highlights: {
      encoded: e.violationsEncoded,
      paid: e.violationsPaid,
      towed: e.illegalParkersTowed,
    },
    refunds: {
      processed: { count: f.refundsProcessedCount, total: f.refundsProcessedAmount },
      pending: { count: f.refundsPendingCount, total: f.refundsPendingAmount },
      transactions: f.refundRows.map((r) => ({
        date: shortDate(r.date),
        amount: r.amount || 0,
        status: r.status,
        category: r.category,
        reason: r.reason,
      })),
    },
    expenses: {
      total: expensesTotal,
      byCategory: expensesByCategory,
      table: expensesByCategory,
    },
    customerService: {
      caseCount: cs.totalCases,
      activities: Object.entries(cs.outcomeCount).map(([type, count]) => ({ type, count })),
    },
    serviceAnalytics: {
      total: cs.totalCases,
      resolved: cs.resolved,
      resolutionRate: round1(cs.resolutionRate),
      frt: {
        avg: round1(cs.avgFRT),
        instantPct: round1(cs.instantPct),
        under5Pct: round1(cs.under5MinPct),
        under5: cs.under5MinFRT,
        peak: cs.peakFRT,
      },
      dailyAverage: round1(cs.dailyAverage),
      dailyVolume: dailyVolumeEntries.map(([date, count]) => ({ label: dayLabel(date), count })),
      channels: Object.entries(cs.channelDist).map(([source, count]) => ({ source, count })),
      topReasons: cs.topReasons.map((r) => ({ label: r.reason, count: r.count })),
      outcomes: Object.entries(cs.outcomeCount).map(([outcome, count]) => ({ outcome, count })),
    },
    enforcement: {
      towLog: e.towLog.map((t) => ({ date: shortDate(t.date), plate: t.licensePlate, facility: t.facility, company: t.towingCompany })),
      parkpliantRecords: e.parkpliantLog.map((p) => ({
        notice: p.noticeNumber,
        date: shortDateTime(p.date),
        amount: p.amount || 0,
        status: p.status,
        facility: p.facility,
      })),
    },
  };
}

function toCharts(week) {
  const f = week.financials;
  const e = week.enforcement;

  const refundBreakdown = [
    { status: 'Processed', count: f.refundsProcessedCount },
    { status: 'Pending', count: f.refundsPendingCount },
  ].filter((r) => r.count > 0);

  const expenseBreakdown = Object.entries(f.expenseByCategory).map(([category, amount]) => ({ category, amount }));

  const byDay = {};
  e.parkpliantLog.forEach((p) => {
    const day = String(p.date || '').slice(0, 10);
    if (!day) return;
    byDay[day] = (byDay[day] || 0) + 1;
  });
  const violationsTrend = Object.entries(byDay)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, count]) => ({ date: shortDate(day), count }));

  return { refundBreakdown, expenseBreakdown, violationsTrend };
}

/** Build an ExecutiveDashboard-ready `report` from a single Airtable week. */
export function toExecutiveReport(week) {
  if (!week) return null;
  return {
    sections: toSections(week),
    charts: toCharts(week),
    meta: {
      currency: 'USD',
      period: { start: week.weekStart, end: week.weekEnd },
      generatedAt: new Date().toISOString(),
    },
    summary: buildSummary(week),
  };
}
