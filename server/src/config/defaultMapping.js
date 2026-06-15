/**
 * Default ReportConfig.
 *
 * This single object drives the entire reporting pipeline. Everything here is
 * overridable per-request: the client can fetch this default (GET
 * /api/config/default), let an admin tweak it in the mapping panel, and send the
 * modified version with the generate request. Nothing downstream hard-codes a
 * column name or a status keyword — it all comes from here.
 *
 *  - columnMap : logical field  ->  the CSV header that holds it
 *  - rules     : value-classification keywords (matched case-insensitively)
 *  - formulas  : how each computed metric aggregates over the rows
 */
export const defaultConfig = {
  columnMap: {
    violationStatus: 'Violation Status',
    paymentStatus: 'Payment Status',
    // Parkpliant Violations sheet fields. This sheet is the SOLE source for the
    // encoded-violations and paid-on-Parkpliant metrics (identified by its
    // "Violation Notice number" column). A row is "paid on Parkpliant" when its
    // Violation Status is Paid or it has a Settlement date.
    violationNotice: 'Violation Notice number',
    settlementDate: 'Settlement date',
    violationAmount: 'Violation Amount',
    towingStatus: 'Towing Status',
    // Weekly Revenue summary sheet (single pre-aggregated row). Sole source for
    // the revenue metrics. NOTE: the export header misspells "Transient".
    netTransient: 'NET TRASIENT',
    transientReservations: 'NO. of  transient reservations',
    netMonthly: 'Net Monthly',
    monthlyReservations: 'NO. of monthly reservations',
    totalNetRemit: 'TOTAL NET REMIT',
    totalReservations: 'NO. of total reservations',
    // Tow-log fields. The Towed Illegal Parkers export is a dedicated tow log
    // where EVERY row is a completed tow, identified by a license plate and a
    // towing company. The towed count = rows in such a file that have a plate.
    towingCompany: 'TOWING COMPANY',
    licensePlate: 'LICENSE PLATE',
    refundStatus: 'Refund Status',
    // Refund/Reimbursement sheet marker (e.g. refund-grid view export). The
    // refund metrics are sourced exclusively from files that have this column.
    endorsedBy: 'ENDORSED BY',
    expenseCategory: 'Expense Category',
    // Management Expenses sheet marker. That sheet is the SOLE source for the
    // Expenses metric (identified by its distinctive "PURPOSE" column), so
    // refunds/payments sheets never leak into expense totals.
    expensePurpose: 'PURPOSE',
    amount: 'Amount',
    netRemitAmount: 'Net Remit',
    refundAmount: 'Refund Amount',
    expenseAmount: 'Expense Amount',
    notes: 'Notes',
    date: 'Date',
    csFlag: 'Customer Service',
    // Customer Tracking sheet marker. Every row in that sheet is a customer
    // service interaction; it is identified by its "REASON FOR CONTACT
    // CATEGORY" column and is the SOLE source for the Customer Service metric.
    csReasonCategory: 'REASON FOR CONTACT CATEGORY',
    // Customer Service detail fields (used only for tracking-sheet rows) that
    // power the service-analytics section. NOTE: no agent/workforce field is
    // mapped or surfaced — "ASSISTED BY" is intentionally NOT used as a metric.
    csChannel: 'SOURCE',
    csFrt: 'FRT',
    csStatus: 'STATUS',
    csAction: 'ACTION TAKEN CATEGORY',
    // Tow Activity Log fields (tow-log rows): the facility a vehicle was towed from.
    facility: 'FACILITY',
  },

  rules: {
    // Status-based towing keywords (for files that record a towing STATUS).
    // Presence-based towing for the Towed Illegal Parkers source is handled
    // separately via the dedicated `towedTime` field (see highlights section).
    towed: ['towed', 'tow'],
    paid: ['paid', 'settled'],
    encoded: ['encoded', 'recorded', 'logged'],
    // Refund sheets record the refund's payout state as "PAID" (processed) or
    // "PENDING"; keep the older Approved-* values too.
    refundProcessed: ['approved-processed', 'processed', 'completed', 'paid'],
    refundPending: ['approved-pending', 'pending'],
    csIndicators: ['inquiry', 'complaint', 'request', 'yes', 'true'],
  },

  formulas: {
    // Net remittance = sum of the netRemitAmount column for rows whose payment
    // status classifies as "paid". Change field/agg/filter to redefine.
    netRemit: { field: 'netRemitAmount', agg: 'sum', filter: { paymentStatus: 'paid' } },
  },

  // Expense category normalization. Aliases fold variants into one canonical
  // category; non-monetary categories are tracking-only (no amount).
  expenseCategoryAliases: {
    other: 'Management Expenses',
    'other expenses': 'Management Expenses',
    others: 'Management Expenses',
    miscellaneous: 'Management Expenses',
    misc: 'Management Expenses',
  },
  nonMonetaryCategories: ['customer tracking sheet'],

  // Logical fields that MUST be present across the uploaded file(s). Only a date
  // is required (some sources, like the tow log, have no violation column);
  // every other field is optional and degrades gracefully when absent.
  requiredFields: ['date'],

  currency: 'PHP',
  dateGrouping: 'day', // 'day' | 'week'
};

/**
 * Merge a user-supplied partial config over the defaults (one level deep on the
 * known sub-objects). Lets the client send only the fields an admin changed.
 */
export function resolveConfig(userConfig) {
  if (!userConfig || typeof userConfig !== 'object') return { ...defaultConfig };
  return {
    ...defaultConfig,
    ...userConfig,
    columnMap: { ...defaultConfig.columnMap, ...(userConfig.columnMap || {}) },
    rules: { ...defaultConfig.rules, ...(userConfig.rules || {}) },
    formulas: { ...defaultConfig.formulas, ...(userConfig.formulas || {}) },
    expenseCategoryAliases: {
      ...defaultConfig.expenseCategoryAliases,
      ...(userConfig.expenseCategoryAliases || {}),
    },
    nonMonetaryCategories: userConfig.nonMonetaryCategories || defaultConfig.nonMonetaryCategories,
    requiredFields: userConfig.requiredFields || defaultConfig.requiredFields,
  };
}

export default defaultConfig;
