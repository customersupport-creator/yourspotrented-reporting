import { defaultConfig } from '../src/config/defaultMapping.js';
import { mapCsv } from '../src/services/mapper.js';
import { parseCsv } from '../src/services/csvParser.js';

export const config = defaultConfig;

/** A small, hand-counted CSV used across unit tests. */
export const SAMPLE_CSV = `Date,Violation Status,Payment Status,Towing Status,Refund Status,Customer Service,Expense Category,Amount,Net Remit,Refund Amount,Expense Amount,Notes
2026-06-01,Encoded,Paid,Towed,,,,1500,1350,,,A
2026-06-01,Encoded,Paid,Towed,Approved-Processed,Inquiry,,1500,1350,500,,B
2026-06-02,Encoded,Unpaid,,Approved-Pending,Complaint,,1500,0,750,,C
2026-06-02,Encoded,Settled,,,,,800,720,,,D
2026-06-03,,,,,Request,Fuel,,,,1200,E`;

// Expected, hand-counted from SAMPLE_CSV:
//   encoded = 4 (rows 1-4), paid = 3 (Paid,Paid,Settled), towed = 2
//   netRemit = 1350+1350+720 = 3420 (paid rows only; row3 unpaid excluded)
//   refunds processed = 1 / 500 ; pending = 1 / 750
//   cs cases = 3 (Inquiry, Complaint, Request)
//   expenses = 1200 (Fuel)
export const EXPECTED = {
  encoded: 4,
  paid: 3,
  towed: 2,
  netRemit: 3420,
  refundsProcessed: { count: 1, total: 500 },
  refundsPending: { count: 1, total: 750 },
  csCases: 3,
  expensesTotal: 1200,
};

/** Parse + map the sample into normalized rows. */
export function normalizedSample() {
  const { headers, rows } = parseCsv(SAMPLE_CSV);
  return mapCsv(headers, rows, config);
}
