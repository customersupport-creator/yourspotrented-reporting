import { SummaryProvider } from './SummaryProvider.js';
import { formatCurrency, formatCount } from '../../utils/num.js';

/**
 * TemplateSummaryProvider — deterministic, offline management-style narrative.
 *
 * Builds the summary clause-by-clause from computed metrics, pluralizing counts,
 * formatting PHP, and gracefully omitting clauses whose values are zero so the
 * prose never reads "0 refunds were approved". Output is structurally identical
 * to the brief's example.
 */
export class TemplateSummaryProvider extends SummaryProvider {
  generate(metrics, config) {
    const currency = config?.currency || 'PHP';
    const n = (x) => formatCount(x);
    const money = (x) => formatCurrency(x, currency);
    const clauses = [];

    // Towing + encoding + payments
    if (metrics.towed > 0) {
      clauses.push(
        `This week, ${n(metrics.towed)} illegal ${plural(metrics.towed, 'parker', 'parkers')} ${was(metrics.towed)} towed.`
      );
    }

    if (metrics.encoded > 0) {
      const paidPart =
        metrics.paid > 0 ? `, with ${n(metrics.paid)} successfully paid` : '';
      clauses.push(
        `A total of ${n(metrics.encoded)} ${plural(metrics.encoded, 'violation', 'violations')} ${was(metrics.encoded)} encoded into Parkpliant${paidPart}.`
      );
    } else if (metrics.paid > 0) {
      clauses.push(`${n(metrics.paid)} ${plural(metrics.paid, 'violation', 'violations')} ${was(metrics.paid)} successfully paid on Parkpliant.`);
    }

    // Customer service
    if (metrics.csCases > 0) {
      clauses.push(
        `Customer service handled ${n(metrics.csCases)} ${plural(metrics.csCases, 'inquiry', 'inquiries')}.`
      );
    }

    // Net remittance
    if (metrics.netRemit > 0) {
      clauses.push(`Net remittance reached ${money(metrics.netRemit)}.`);
    }

    // Refunds
    const refundClause = buildRefundClause(metrics, n);
    if (refundClause) clauses.push(refundClause);

    // Expenses
    if (metrics.expenses > 0) {
      clauses.push(`Total operating expenses amounted to ${money(metrics.expenses)}.`);
    }

    if (clauses.length === 0) {
      return 'No reportable activity was found in the uploaded data for this period.';
    }
    return clauses.join(' ');
  }
}

function plural(count, singular, pluralForm) {
  return count === 1 ? singular : pluralForm;
}

function was(count) {
  return count === 1 ? 'was' : 'were';
}

function buildRefundClause(metrics, n) {
  const processed = metrics.refundsProcessedCount || 0;
  const pending = metrics.refundsPendingCount || 0;
  if (processed === 0 && pending === 0) return null;

  const parts = [];
  if (processed > 0) {
    parts.push(`${n(processed)} ${plural(processed, 'refund', 'refunds')} ${was(processed)} approved and processed`);
  }
  if (pending > 0) {
    if (processed > 0) {
      parts.push(`${n(pending)} ${pending === 1 ? 'remains' : 'remain'} pending`);
    } else {
      parts.push(`${n(pending)} ${plural(pending, 'refund', 'refunds')} ${was(pending)} approved but still pending`);
    }
  }

  // "Three refunds were approved and processed while two remain pending."
  if (parts.length === 2) return `${capitalize(parts[0])} while ${parts[1]}.`;
  return `${capitalize(parts[0])}.`;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default TemplateSummaryProvider;
