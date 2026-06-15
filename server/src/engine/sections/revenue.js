import { round2 } from '../../utils/num.js';
import { classify } from '../../services/mapper.js';

/**
 * FINANCIAL PERFORMANCE / REVENUE
 *
 * Revenue split comes exclusively from the Weekly Revenue summary sheet (a single
 * pre-aggregated row identified by its "TOTAL NET REMIT" / "NET TRASIENT"
 * columns). Enforcement revenue and Parkpliant collections come from the
 * Parkpliant Violations sheet; refund impact from the refund counts.
 *
 * Returns null when no revenue sheet is present (section omitted).
 */
function pct(num, den) {
  return den > 0 ? round2((num / den) * 100) : 0;
}

export default {
  key: 'revenue',
  title: 'Financial Performance',
  compute(rows, config) {
    const rev = rows.filter((r) => r._revenueSource);
    if (rev.length === 0) return null;

    const sum = (field) => round2(rev.reduce((a, r) => a + (Number(r[field]) || 0), 0));
    const netTransient = sum('netTransient');
    const netMonthly = sum('netMonthly');
    const transientCount = Math.round(sum('transientReservations'));
    const monthlyCount = Math.round(sum('monthlyReservations'));

    let totalNet = sum('totalNetRemit');
    if (!totalNet) totalNet = round2(netTransient + netMonthly);
    let totalCount = Math.round(sum('totalReservations'));
    if (!totalCount) totalCount = transientCount + monthlyCount;

    // Enforcement revenue (Σ violation amounts) + collections (paid) from Parkpliant.
    const pk = rows.filter((r) => r._parkpliantSource);
    const enforcementRevenue = round2(pk.reduce((a, r) => a + (Number(r.violationAmount) || 0), 0));
    const parkpliantCollections = round2(
      pk
        .filter(
          (r) => classify(r.violationStatus, config.rules?.paid || []) || String(r.settlementDate || '').trim() !== ''
        )
        .reduce((a, r) => a + (Number(r.violationAmount) || 0), 0)
    );

    return {
      totalNet,
      totalCount,
      transient: {
        revenue: netTransient,
        count: transientCount,
        share: pct(netTransient, totalNet),
        avg: transientCount ? round2(netTransient / transientCount) : 0,
      },
      monthly: {
        revenue: netMonthly,
        count: monthlyCount,
        share: pct(netMonthly, totalNet),
        avg: monthlyCount ? round2(netMonthly / monthlyCount) : 0,
      },
      avgPerReservation: totalCount ? round2(totalNet / totalCount) : 0,
      enforcementRevenue,
      parkpliantCollections,
    };
  },
};
