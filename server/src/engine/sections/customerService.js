import { classify } from '../../services/mapper.js';

/**
 * CUSTOMER SERVICE PROVIDED
 *  - count of customer service interactions handled
 *  - a concise high-level grouping of those interactions
 *
 * Source-specific: when a Customer Tracking sheet is present (identified by its
 * "REASON FOR CONTACT CATEGORY" column), EVERY row in it is a customer service
 * interaction, so the count is the number of those records. Interactions are
 * grouped by their reason-for-contact category for a concise summary.
 *
 * Fallback (no tracking sheet): a row counts when its csFlag column matches a
 * configured indicator (e.g. "Inquiry", "Complaint", "Request").
 */
export default {
  key: 'customerService',
  title: 'Customer Service Provided',
  compute(rows, config) {
    const { rules } = config;
    const hasCsSource = rows.some((r) => r._csSource);
    const byType = new Map();
    let caseCount = 0;

    const addActivity = (label, note) => {
      const clean = String(label || '').trim() || 'Uncategorized';
      const key = clean.toLowerCase();
      if (!byType.has(key)) byType.set(key, { type: clean, count: 0, samples: [] });
      const entry = byType.get(key);
      entry.count += 1;
      if (entry.samples.length < 3 && note) entry.samples.push(note);
    };

    for (const row of rows) {
      if (hasCsSource) {
        // Every record in the tracking sheet is a customer service interaction.
        if (!row._csSource) continue;
        caseCount += 1;
        addActivity(row.csReasonCategory, row.notes);
      } else {
        if (!classify(row.csFlag, rules.csIndicators)) continue;
        caseCount += 1;
        addActivity(row.csFlag, row.notes);
      }
    }

    // Keep the overview concise: top categories only.
    const activities = [...byType.values()].sort((a, b) => b.count - a.count).slice(0, 8);
    return { caseCount, activities };
  },
};
