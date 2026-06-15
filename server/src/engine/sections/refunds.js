import { classify } from '../../services/mapper.js';
import { round2 } from '../../utils/num.js';

/**
 * REFUNDS / REIMBURSEMENTS
 *  - Approved and Processed: count + total amount
 *  - Approved but Pending:   count + total amount
 *
 * Classification of the refundStatus column is configurable via
 * rules.refundProcessed and rules.refundPending.
 */
export default {
  key: 'refunds',
  title: 'Refunds / Reimbursements',
  compute(rows, config) {
    const { rules } = config;
    const processed = { count: 0, total: 0 };
    const pending = { count: 0, total: 0 };

    for (const row of rows) {
      const amount = Number(row.refundAmount) || 0;
      if (classify(row.refundStatus, rules.refundProcessed)) {
        processed.count += 1;
        processed.total += amount;
      } else if (classify(row.refundStatus, rules.refundPending)) {
        pending.count += 1;
        pending.total += amount;
      }
    }

    processed.total = round2(processed.total);
    pending.total = round2(pending.total);
    return { processed, pending };
  },
};
