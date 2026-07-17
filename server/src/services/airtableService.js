const BASE_ID = process.env.AIRTABLE_BASE_ID;
const API_KEY = process.env.AIRTABLE_API_KEY;

const TABLES = {
  REFUNDS: 'tblRziRjireToOPoF',
  EXPENSES: 'tblZUQYJfjuqnVG16',
  TOWED: 'tblLgNB8RQvy4xiW5',
  PARKPLIANT: 'tblZCyd4Jc1jMx9an',
  CUSTOMER_SERVICE: 'tblViMnfhcqyMKBHU',
  WEEKLY_REVENUE: 'tblQiizFGlChGFnzT',
  WEEKLY_REPORT: 'tbleah1RWp0CqgsWs',
};

async function fetchRecords(tableId, filterFormula) {
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`);
  if (filterFormula) url.searchParams.set('filterByFormula', filterFormula);

  let records = [];
  let offset = null;

  do {
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (!res.ok) throw new Error(`Airtable error on ${tableId}: ${res.status}`);
    const data = await res.json();
    records = records.concat(data.records);
    offset = data.offset || null;
  } while (offset);

  return records;
}

function dateFilter(startDate, endDate, fieldName = 'DATE') {
  return `AND(IS_AFTER({${fieldName}}, '${startDate}'), IS_BEFORE({${fieldName}}, '${endDate}'))`;
}

export async function getWeekData(weekStart, weekEnd) {
  const [refunds, expenses, towed, parkpliant, csRecords, revenueRecords] =
    await Promise.all([
      fetchRecords(TABLES.REFUNDS, dateFilter(weekStart, weekEnd)),
      fetchRecords(TABLES.EXPENSES, dateFilter(weekStart, weekEnd)),
      fetchRecords(TABLES.TOWED, dateFilter(weekStart, weekEnd, 'DATE')),
      fetchRecords(TABLES.PARKPLIANT, dateFilter(weekStart, weekEnd, 'Encoded date and time')),
      fetchRecords(TABLES.CUSTOMER_SERVICE, dateFilter(weekStart, weekEnd)),
      fetchRecords(TABLES.WEEKLY_REVENUE, `AND({Week Start} >= '${weekStart}', {Week End} <= '${weekEnd}')`),
    ]);

  const refundRows = refunds.map((r) => r.fields);
  const expenseRows = expenses.map((r) => r.fields);
  const revenueRow = revenueRecords[0]?.fields || {};

  const refundsProcessed = refundRows.filter(
    (r) => r.STATUS === 'Paid' && (r.CATEGORY === 'REFUND' || r.CATEGORY === 'REFUND+REWARD')
  );
  const refundsPending = refundRows.filter(
    (r) => r.STATUS !== 'Paid' && (r.CATEGORY === 'REFUND' || r.CATEGORY === 'REFUND+REWARD')
  );

  const totalRefundsProcessed = refundsProcessed.reduce((s, r) => s + (r.AMOUNT || 0), 0);
  const totalRefundsPending = refundsPending.reduce((s, r) => s + (r.AMOUNT || 0), 0);
  const totalExpenses = expenseRows.reduce((s, r) => s + (r[' AMOUNT '] || 0), 0);

  const netTransient = revenueRow['Net Transient ($)'] || 0;
  const netMonthly = revenueRow['Net Monthly ($)'] || 0;
  const spotHero = revenueRow['Transient – SpotHero ($)'] || 0;
  const totalNetRemit = revenueRow['Total Net Remit ($)'] || netTransient + netMonthly;
  const totalReservations = revenueRow['# Total Reservations'] || 0;
  const transientReservations = revenueRow['# Transient Reservations'] || 0;
  const monthlyReservations = revenueRow['# Monthly Reservations'] || 0;

  const expenseByCategory = {};
  expenseRows.forEach((r) => {
    const cat = r.CATEGORY || 'OTHER';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (r[' AMOUNT '] || 0);
  });

  const refundByCategory = {};
  refundRows.forEach((r) => {
    const cat = r.CATEGORY || 'OTHER';
    refundByCategory[cat] = (refundByCategory[cat] || 0) + (r.AMOUNT || 0);
  });

  const towedRows = towed.map((r) => r.fields);
  const parkpliantRows = parkpliant.map((r) => r.fields);

  const illegalParkersTowed = towedRows.length;
  const violationsEncoded = parkpliantRows.length;
  const violationsPaid = parkpliantRows.filter((r) => r['Violation Status'] === 'Paid').length;
  const collectionRate = violationsEncoded > 0 ? (violationsPaid / violationsEncoded) * 100 : 0;
  const towConversionRate = violationsEncoded > 0 ? (illegalParkersTowed / violationsEncoded) * 100 : 0;

  const towLog = towedRows.map((r) => ({
    date: r.DATE,
    licensePlate: r['LICENSE PLATE'],
    facility: r.FACILITY,
    towingCompany: r['TOWING COMPANY'],
  }));

  const parkpliantLog = parkpliantRows.map((r) => ({
    noticeNumber: r['Violation Notice number'],
    date: r['Encoded date and time'],
    amount: r['Violation Amount'],
    status: r['Violation Status'],
    facility: r['FACILITY']?.[0] || '',
  }));

  const csRows = csRecords.map((r) => r.fields);
  const totalCases = csRows.length;
  const resolved = csRows.filter((r) => r.STATUS === 'Resolved').length;
  const resolutionRate = totalCases > 0 ? (resolved / totalCases) * 100 : 0;

  const frtValues = csRows
    .map((r) => parseFloat(r.FRT))
    .filter((v) => !isNaN(v));
  const avgFRT = frtValues.length > 0
    ? frtValues.reduce((s, v) => s + v, 0) / frtValues.length
    : 0;
  const under5MinFRT = frtValues.filter((v) => v <= 5).length;
  const under5MinPct = frtValues.length > 0 ? (under5MinFRT / frtValues.length) * 100 : 0;
  const peakFRT = frtValues.length > 0 ? Math.max(...frtValues) : 0;

  const dailyVolume = {};
  csRows.forEach((r) => {
    const d = r.DATE;
    if (d) dailyVolume[d] = (dailyVolume[d] || 0) + 1;
  });

  const channelDist = {};
  csRows.forEach((r) => {
    const src = r.SOURCE || 'Unknown';
    channelDist[src] = (channelDist[src] || 0) + 1;
  });

  const reasonCount = {};
  csRows.forEach((r) => {
    const reason = r['REASON FOR CONTACT CATEGORY'] || 'Other';
    reasonCount[reason] = (reasonCount[reason] || 0) + 1;
  });
  const topReasons = Object.entries(reasonCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([reason, count]) => ({ reason, count }));

  const outcomeCount = {};
  csRows.forEach((r) => {
    const outcome = r['ACTION TAKEN CATEGORY'] || 'Other';
    outcomeCount[outcome] = (outcomeCount[outcome] || 0) + 1;
  });

  return {
    weekStart,
    weekEnd,
    financials: {
      totalNetRemit,
      netTransient,
      netMonthly,
      spotHero,
      totalReservations,
      transientReservations,
      monthlyReservations,
      refundsProcessedCount: refundsProcessed.length,
      refundsProcessedAmount: totalRefundsProcessed,
      refundsPendingCount: refundsPending.length,
      refundsPendingAmount: totalRefundsPending,
      totalExpenses,
      expenseByCategory,
      refundByCategory,
      refundRows: refundRows.map((r) => ({
        date: r.DATE,
        amount: r.AMOUNT,
        status: r.STATUS,
        category: r.CATEGORY,
        reason: r['DETAILED REASON'] || r['REASON CATEGORY'] || '',
      })),
    },
    enforcement: {
      illegalParkersTowed,
      violationsEncoded,
      violationsPaid,
      collectionRate,
      towConversionRate,
      towLog,
      parkpliantLog,
    },
    customerService: {
      totalCases,
      resolved,
      resolutionRate,
      avgFRT,
      under5MinFRT,
      under5MinPct,
      peakFRT,
      dailyAverage: totalCases / 7,
      dailyVolume,
      channelDist,
      topReasons,
      outcomeCount,
    },
  };
}

export async function getPreviousWeekData(weekStart) {
  const start = new Date(weekStart);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - 6);

  const fmt = (d) => d.toISOString().split('T')[0];
  return getWeekData(fmt(prevStart), fmt(prevEnd));
}
