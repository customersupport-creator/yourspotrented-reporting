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

/** Inclusive day window from a list of date-ish values. */
export function windowFromDates(values) {
  const tss = values.map(parseYmd).filter(Boolean);
  if (!tss.length) return null;
  const sorted = tss.slice().sort((a, b) => a.ts - b.ts);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return { start: min.ymd, end: max.ymd, startTs: min.ts, endTs: max.ts + DAY - 1 };
}
