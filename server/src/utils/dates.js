/**
 * Timezone-stable date parsing for report windows.
 *
 * Values may be "M/D/YYYY", "YYYY-MM-DD", or carry a time ("6/1/2026 1:00pm").
 * We use ONLY the date portion and build a UTC-midnight timestamp so window
 * labels and comparisons never drift across timezones.
 */
export function parseYmd(value) {
  const s = String(value || '').trim().split(/[ T]/)[0];
  if (!s) return null;

  let y;
  let m;
  let d;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (mdy) {
    m = +mdy[1];
    d = +mdy[2];
    y = +mdy[3];
  } else if (iso) {
    y = +iso[1];
    m = +iso[2];
    d = +iso[3];
  } else {
    const dt = new Date(s);
    if (Number.isNaN(dt.getTime())) return null;
    y = dt.getUTCFullYear();
    m = dt.getUTCMonth() + 1;
    d = dt.getUTCDate();
  }

  const ymd = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { ymd, ts: Date.UTC(y, m - 1, d) };
}

const DAY = 86400000;

function ymdOf(ts) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Inclusive day window from a list of date-ish values.
 * With { weekAlign: true } the window snaps to the Monday–Sunday week
 * (weekly reporting standard): start = Monday on/before the earliest date,
 * end = Sunday on/after the latest date. All math is UTC, so it's tz-stable.
 */
export function windowFromDates(values, { weekAlign = false } = {}) {
  const tss = values.map(parseYmd).filter(Boolean);
  if (!tss.length) return null;
  const sorted = tss.slice().sort((a, b) => a.ts - b.ts);
  let startTs = sorted[0].ts;
  let endTs = sorted[sorted.length - 1].ts;

  if (weekAlign) {
    const daysSinceMonday = (new Date(startTs).getUTCDay() + 6) % 7; // Mon=0 … Sun=6
    startTs -= daysSinceMonday * DAY;
    const daysUntilSunday = (7 - new Date(endTs).getUTCDay()) % 7; // 0 when already Sunday
    endTs += daysUntilSunday * DAY;
  }

  return { start: ymdOf(startTs), end: ymdOf(endTs), startTs, endTs: endTs + DAY - 1 };
}
