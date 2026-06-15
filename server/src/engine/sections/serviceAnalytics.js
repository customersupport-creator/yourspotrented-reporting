import { round2 } from '../../utils/num.js';

/**
 * CUSTOMER SERVICE PERFORMANCE (analytics)
 *
 * Derived exclusively from the Customer Tracking sheet (rows flagged
 * `_csSource`). Powers the executive Customer Service section: resolution rate,
 * first-response-time stats, daily case volume, contact-channel mix, top contact
 * reasons, and resolution outcomes.
 *
 * NOTE: This section contains NO agent/workforce analytics — no per-agent
 * counts, scorecards, or productivity metrics are computed or returned.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return { key: '￿', label: 'Unknown' };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { key: raw, label: raw.slice(0, 10) };
  const key = d.toISOString().slice(0, 10);
  return { key, label: `${WEEKDAYS[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}` };
}

/**
 * Normalize an ACTION TAKEN CATEGORY value into a resolution-outcome bucket.
 * Matching is intentionally strict so variants like "CorrectedParking" and
 * "Cancel advised" fall into "Other" rather than inflating Parked/Cancelled.
 */
function outcomeBucket(raw) {
  const nv = String(raw || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!nv) return 'Other';
  if (nv === 'noresponse') return 'No Response';
  if (nv === 'confirmed') return 'Confirmed';
  if (nv.startsWith('relocat')) return 'Relocated';
  if (nv === 'parked') return 'Parked';
  if (nv === 'cancelled' || nv === 'canceled') return 'Cancelled';
  if (nv === 'refunded') return 'Refunded';
  return 'Other';
}

function topCounts(map, limit) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, count]) => ({ label, count }));
}

export default {
  key: 'serviceAnalytics',
  title: 'Customer Service Performance',
  compute(rows, config) {
    const cs = rows.filter((r) => r._csSource);
    if (cs.length === 0) return null; // section omitted when no tracking sheet present

    const total = cs.length;
    const resolved = cs.filter((r) => /resolved/i.test(String(r.csStatus || ''))).length;

    // First response time (minutes)
    const frts = cs.map((r) => parseFloat(String(r.csFrt))).filter((n) => Number.isFinite(n));
    const frtCount = frts.length || 1;
    const frtSum = frts.reduce((a, b) => a + b, 0);
    const instant = frts.filter((n) => n === 0).length;
    const under5 = frts.filter((n) => n <= 5).length;
    const peak = frts.length ? Math.max(...frts) : 0;

    // Daily case volume
    const dayMap = new Map();
    for (const r of cs) {
      const { key, label } = dayLabel(r.date);
      if (!dayMap.has(key)) dayMap.set(key, { key, label, count: 0 });
      dayMap.get(key).count += 1;
    }
    const dailyVolume = [...dayMap.values()].sort((a, b) => (a.key < b.key ? -1 : 1)).map(({ label, count }) => ({ label, count }));

    // Contact channels (SOURCE)
    const channelMap = new Map();
    const reasonMap = new Map();
    const outcomeMap = new Map();
    for (const r of cs) {
      const ch = String(r.csChannel || '').trim() || 'Unknown';
      channelMap.set(ch, (channelMap.get(ch) || 0) + 1);

      const reason = String(r.csReasonCategory || '').trim() || 'Uncategorized';
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);

      const bucket = outcomeBucket(r.csAction);
      outcomeMap.set(bucket, (outcomeMap.get(bucket) || 0) + 1);
    }

    const days = dayMap.size || 1;

    return {
      total,
      resolved,
      resolutionRate: round2((resolved / total) * 100),
      dailyAverage: round2(total / days),
      frt: {
        avg: round2(frtSum / frtCount),
        instant,
        instantPct: round2((instant / total) * 100),
        under5,
        under5Pct: round2((under5 / total) * 100),
        peak,
      },
      dailyVolume,
      channels: [...channelMap.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
      topReasons: topCounts(reasonMap, 10),
      outcomes: [...outcomeMap.entries()].map(([outcome, count]) => ({ outcome, count })).sort((a, b) => b.count - a.count),
    };
  },
};
