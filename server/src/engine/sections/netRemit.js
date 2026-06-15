import { classify } from '../../services/mapper.js';
import { round2 } from '../../utils/num.js';

/**
 * WEEKLY TOTAL NET REMIT
 *
 * Driven by config.formulas.netRemit so the rule is configurable:
 *   { field: 'netRemitAmount', agg: 'sum', filter: { paymentStatus: 'paid' } }
 *
 * - field  : which normalized amount field to aggregate
 * - agg    : 'sum' (default) | 'count'
 * - filter : optional { <logicalStatusField>: <ruleName> } gate — only rows
 *            whose status classifies under that rule are included.
 */
export default {
  key: 'netRemit',
  title: 'Weekly Total Net Remit',
  compute(rows, config) {
    const formula = config.formulas?.netRemit || { field: 'netRemitAmount', agg: 'sum' };
    const { field, agg = 'sum', filter } = formula;

    const matches = rows.filter((row) => {
      if (!filter) return true;
      return Object.entries(filter).every(([statusField, ruleName]) => {
        const keywords = config.rules?.[ruleName] || [];
        return classify(row[statusField], keywords);
      });
    });

    let total;
    if (agg === 'count') {
      total = matches.length;
    } else {
      total = round2(matches.reduce((sum, row) => sum + (Number(row[field]) || 0), 0));
    }

    return { total, contributingRows: matches.length };
  },
};
