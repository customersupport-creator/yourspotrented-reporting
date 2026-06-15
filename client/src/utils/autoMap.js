/**
 * Auto-map detected CSV headers to logical fields.
 *
 * Real CSV exports rarely match the default header names exactly (different
 * casing, spaces vs underscores, abbreviations). This matcher normalizes both
 * sides and uses a synonyms table so most files "just work" — and whatever it
 * can't match is left blank for the admin panel to resolve.
 */

const SYNONYMS = {
  violationStatus: ['violation status', 'violation', 'violationstatus'],
  paymentStatus: ['payment status', 'payment', 'paymentstatus', 'paystatus'],
  violationNotice: ['violation notice number', 'violation notice', 'notice number', 'violation number', 'ticket number'],
  settlementDate: ['settlement date', 'settlementdate', 'settled date', 'settlement'],
  towingStatus: ['towing status', 'tow status', 'towing', 'towstatus', 'towed'],
  towingCompany: ['towing company', 'towingcompany', 'tow company', 'towco'],
  licensePlate: ['license plate', 'licenseplate', 'plate number', 'platenumber', 'plate no', 'plateno', 'plate'],
  refundStatus: ['refund status', 'refundstatus', 'reimbursement', 'status'],
  endorsedBy: ['endorsed by', 'endorsedby'],
  expenseCategory: ['expense category', 'expensecategory', 'expensetype', 'category'],
  expensePurpose: ['purpose'],
  csReasonCategory: ['reason for contact category', 'reason for contact', 'reasonforcontact'],
  csChannel: ['source'],
  csFrt: ['frt', 'first response time'],
  csStatus: ['status'],
  csAction: ['action taken category', 'action taken', 'action category'],
  facility: ['facility', 'facility title'],
  violationAmount: ['violation amount', 'violationamount', 'fine amount'],
  netTransient: ['net trasient', 'net transient', 'nettransient', 'nettrasient'],
  transientReservations: ['no of transient reservations', 'transient reservations', 'no of trasient reservations'],
  netMonthly: ['net monthly', 'netmonthly'],
  monthlyReservations: ['no of monthly reservations', 'monthly reservations'],
  totalNetRemit: ['total net remit', 'totalnetremit'],
  totalReservations: ['no of total reservations', 'total reservations'],
  amount: ['amount', 'amt'],
  netRemitAmount: ['net remit', 'netremit', 'net remittance', 'remittance', 'net amount', 'netamount'],
  refundAmount: ['refund amount', 'refundamount', 'refundamt'],
  expenseAmount: ['expense amount', 'expenseamount', 'expenseamt', 'cost'],
  notes: ['notes', 'note', 'comment', 'comments', 'remarks', 'description'],
  date: ['date', 'transaction date', 'transactiondate', 'datetime', 'timestamp'],
  csFlag: ['customer service', 'customerservice', 'inquiry type', 'inquirytype', 'cs type'],
};

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Fields that must match a header name exactly (no fuzzy substring matching),
// so they don't latch onto a generic "Violation"/"Date" column.
const EXACT_ONLY = new Set(['violationNotice', 'settlementDate', 'csReasonCategory']);

/**
 * @param {string[]} headers   detected CSV headers
 * @param {object}   currentMap the existing columnMap (default config)
 * @returns {{ columnMap: object, matched: string[], unmatched: string[] }}
 */
export function autoMapHeaders(headers, currentMap = {}) {
  const normHeaders = headers.map((h) => ({ raw: h, n: norm(h) }));
  const columnMap = {};
  const matched = [];
  const unmatched = [];

  for (const field of Object.keys(SYNONYMS)) {
    const candidates = [currentMap[field], ...SYNONYMS[field]].filter(Boolean).map(norm);

    // 1) exact normalized match
    let hit = normHeaders.find((h) => candidates.includes(h.n));
    // 2) substring match (token length >= 4 to avoid generic false positives);
    //    skipped for EXACT_ONLY fields like towedTime.
    if (!hit && !EXACT_ONLY.has(field)) {
      hit = normHeaders.find((h) => candidates.some((c) => c.length >= 4 && (h.n.includes(c) || c.includes(h.n))));
    }

    if (hit) {
      columnMap[field] = hit.raw;
      matched.push(field);
    } else {
      columnMap[field] = ''; // leave for manual mapping
      unmatched.push(field);
    }
  }

  return { columnMap, matched, unmatched };
}
