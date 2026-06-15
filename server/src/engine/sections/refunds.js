import { classify } from '../../services/mapper.js';
import { round2 } from '../../utils/num.js';

/**
 * REFUNDS / REIMBURSEMENTS
 *  - Approved and Processed: count + total amount
 *  - Approved but Pending:   count + total amount
 *  - issued: total refund records
 *
 * Source-scoped: when a Refund/Reimbursement sheet is present (a file with an
 * "ENDORSED BY" column, e.g. the refund-grid export), refunds are computed
 * EXCLUSIVELY from its rows — every row is one issued refund record, classified
 * by its STATUS (PAID -> processed, PENDING -> pending) with the refund AMOUNT.
 *
 * Fallback (no refund sheet): the legacy behavior of classifying a refundStatus
 * column across all rows, so single-file/sample uploads still work.
 */
export default {
  key: 'refunds',
  title: 'Refunds / Reimbursements',
  compute(rows, config) {
    const { rules } = config;
    const refundRows = rows.filter((r) => r._refundSource);
    const scoped = refundRows.length > 0;
    const set = scoped ? refundRows : rows;

    const processed = { count: 0, total: 0 };
    const pending = { count: 0, total: 0 };
    let issued = 0;
    let unclassified = 0;

    for (const row of set) {
      const amount = Number(row.refundAmount) || Number(row.amount) || 0;
      const isProcessed = classify(row.refundStatus, rules.refundProcessed);
      const isPending = classify(row.refundStatus, rules.refundPending);

      if (scoped) issued += 1; // every row in a refund sheet is a refund record

      if (isProcessed) {
        processed.count += 1;
        processed.total += amount;
      } else if (isPending) {
        pending.count += 1;
        pending.total += amount;
      } else if (scoped) {
        unclassified += 1; // refund record whose status didn't match a rule
      }
    }

    if (!scoped) issued = processed.count + pending.count;

    return {
      processed: { count: processed.count, total: round2(processed.total) },
      pending: { count: pending.count, total: round2(pending.total) },
      issued,
      unclassified,
      total: round2(processed.total + pending.total),
      sourced: scoped,
    };
  },
};
