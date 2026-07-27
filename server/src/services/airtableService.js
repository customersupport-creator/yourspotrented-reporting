const BASE_ID = process.env.AIRTABLE_BASE_ID;
const API_KEY = process.env.AIRTABLE_API_KEY;

// SpotHero lives in a separate Airtable base. The same API key has access to
// both (see project notes) so no extra credential is required — the base id
// is fixed infrastructure, not a per-environment secret, but it can still be
// overridden via env var if it ever needs to move.
const SPOTHERO_BASE_ID = process.env.SPOTHERO_BASE_ID || 'appsO1gJ4xO36dVq6';

const TABLES = {
  REFUNDS: 'tblRziRjireToOPoF',
  EXPENSES: 'tblZUQYJfjuqnVG16',
  TOWED: 'tblLgNB8RQvy4xiW5',
  PARKPLIANT: 'tblZCyd4Jc1jMx9an',
  CUSTOMER_SERVICE: 'tblViMnfhcqyMKBHU',
  WEEKLY_REPORT: 'tbleah1RWp0CqgsWs',
  // Parkpliant Records' FACILITY field is a linked record — the REST API only
  // ever returns the linked record IDs (never the facility name), so those
  // IDs have to be resolved against this table separately.
  FACILITY_INFO: 'tblmun9KBYW4aYBe1',
};

const SPOTHERO_TABLES = {
  WEEKLY_REMIT: 'tblyyRWW51byWogWX',
};

async function fetchRecords(baseId, tableId, filterFormula) {
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
  if (filterFormula) url.searchParams.set('filterByFormula', filterFormula);

  let records = [];
  let offset = null;

  do {
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Airtable error on ${tableId}: ${res.status} ${body}`.trim());
    }
    const data = await res.json();
    records = records.concat(data.records);
    offset = data.offset || null;
  } while (offset);

  return records;
}

function dateFilter(startDate, endDate, fieldName = 'DATE') {
  return `AND(IS_AFTER({${fieldName}}, '${startDate}'), IS_BEFORE({${fieldName}}, '${endDate}'))`;
}

// Inclusive Start Date >= weekStart AND End Date <= weekEnd, matched by day
// (Airtable formulas have no native ">=" for dates, so same-day + after/before).
function spotHeroWeekFilter(weekStart, weekEnd) {
  return `AND(
    OR(IS_SAME({Start Date}, '${weekStart}', 'day'), IS_AFTER({Start Date}, '${weekStart}')),
    OR(IS_SAME({End Date}, '${weekEnd}', 'day'), IS_BEFORE({End Date}, '${weekEnd}'))
  )`;
}

async function getSpotHeroRemit(weekStart, weekEnd) {
  const records = await fetchRecords(
    SPOTHERO_BASE_ID,
    SPOTHERO_TABLES.WEEKLY_REMIT,
    spotHeroWeekFilter(weekStart, weekEnd)
  );
  const row = records[0]?.fields || {};

  return {
    totalNetRemit: row['Total Net Remit'] || 0,
    netTransient: row['Net Transient'] || 0,
    netMonthly: row['Net Monthly'] || 0,
    totalReservations: row['Total reservations'] || 0,
    transientReservations: row['Transient reservations'] || 0,
    monthlyReservations: row['Monthly reservation'] || 0,
    matched: records.length > 0,
  };
}

export async function getWeekData(weekStart, weekEnd) {
  const [refunds, expenses, towed, parkpliant, csRecords, spotHero, facilities] = await Promise.all([
    fetchRecords(BASE_ID, TABLES.REFUNDS, dateFilter(weekStart, weekEnd)),
    fetchRecords(BASE_ID, TABLES.EXPENSES, dateFilter(weekStart, weekEnd)),
    fetchRecords(BASE_ID, TABLES.TOWED, dateFilter(weekStart, weekEnd, 'DATE')),
    fetchRecords(BASE_ID, TABLES.PARKPLIANT, dateFilter(weekStart, weekEnd, 'Encoded date and time')),
    fetchRecords(BASE_ID, TABLES.CUSTOMER_SERVICE, dateFilter(weekStart, weekEnd)),
    getSpotHeroRemit(weekStart, weekEnd),
    fetchRecords(BASE_ID, TABLES.FACILITY_INFO),
  ]);

  // Map of facility record ID -> facility name, used to resolve Parkpliant's
  // linked FACILITY field (the API only gives back record IDs there).
  const facilityNameById = {};
  facilities.forEach((r) => {
    facilityNameById[r.id] = r.fields['FACILITY NAME'] || '';
  });

  const refundRows = refunds.map((r) => r.fields);
  const expenseRows = expenses.map((r) => r.fields);

  // The refund table's STATUS choices are uppercase ("PAID", "PENDING",
  // "COMPLETED", "CANCELLED") — matching title-case 'Paid' here always failed,
  // which is why "Refunds Processed" always showed 0 despite paid rows
  // existing in the data.
  const refundsProcessed = refundRows.filter(
    (r) => r.STATUS === 'PAID' && (r.CATEGORY === 'REFUND' || r.CATEGORY === 'REFUND+REWARD')
  );
  const refundsPending = refundRows.filter(
    (r) => r.STATUS !== 'PAID' && (r.CATEGORY === 'REFUND' || r.CATEGORY === 'REFUND+REWARD')
  );

  const totalRefundsProcessed = refundsProcessed.reduce((s, r) => s + (r.AMOUNT || 0), 0);
  const totalRefundsPending = refundsPending.reduce((s, r) => s + (r.AMOUNT || 0), 0);
  const totalExpenses = expenseRows.reduce((s, r) => s + (r[' AMOUNT '] || 0), 0);

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
    // Paid violations show the date they actually settled; everything else
    // (still Encoded, or Voided) shows the date it was originally encoded.
    date: r['Violation Status'] === 'Paid'
      ? r['Settlement date'] || r['Encoded date and time']
      : r['Encoded date and time'],
    amount: r['Violation Amount'],
    status: r['Violation Status'],
    // FACILITY is a linked-record field — the API only returns the linked
    // record's ID (e.g. "recXXXXXXXXXXXXXX"), never its name, so it has to be
    // resolved against the Facility Information table fetched above.
    facility: facilityNameById[r['FACILITY']?.[0]] || '',
  }));

  const csRows = csRecords.map((r) => r.fields);
  const totalCases = csRows.length;
  const resolved = csRows.filter((r) => r.STATUS === 'Resolved').length;
  const resolutionRate = totalCases > 0 ? (resolved / totalCases) * 100 : 0;

  const frtValues = csRows.map((r) => parseFloat(r.FRT)).filter((v) => !isNaN(v));
  const avgFRT = frtValues.length > 0 ? frtValues.reduce((s, v) => s + v, 0) / frtValues.length : 0;
  const under5MinFRT = frtValues.filter((v) => v <= 5).length;
  const under5MinPct = frtValues.length > 0 ? (under5MinFRT / frtValues.length) * 100 : 0;
  const peakFRT = frtValues.length > 0 ? Math.max(...frtValues) : 0;
  const instantFRT = frtValues.filter((v) => v === 0).length;
  const instantPct = frtValues.length > 0 ? (instantFRT / frtValues.length) * 100 : 0;

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
      totalNetRemit: spotHero.totalNetRemit,
      netTransient: spotHero.netTransient,
      netMonthly: spotHero.netMonthly,
      totalReservations: spotHero.totalReservations,
      transientReservations: spotHero.transientReservations,
      monthlyReservations: spotHero.monthlyReservations,
      spotHeroMatched: spotHero.matched,
      refundsProcessedCount: refundsProcessed.length,
      refundsProcessedAmount: totalRefundsProcessed,
      refundsPendingCount: refundsPending.length,
      refundsPendingAmount: totalRefundsPending,
      totalExpenses,
      expenseByCategory,
      refundByCategory,
      // Only the processed (PAID) refund/reimbursement rows — this list is
      // rendered under the "Refunds Processed" heading everywhere (dashboard,
      // PDF, email), so it should match what that heading's count/total say,
      // not include pending/cancelled rows too.
      refundRows: refundsProcessed.map((r) => ({
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
      instantPct,
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
