import { parseYmd, windowFromDates } from '../src/utils/dates.js';

describe('parseYmd (timezone-stable)', () => {
  it('parses M/D/YYYY and ISO to the same UTC day', () => {
    expect(parseYmd('6/8/2026').ymd).toBe('2026-06-08');
    expect(parseYmd('2026-06-08').ymd).toBe('2026-06-08');
    expect(parseYmd('6/8/2026 1:00pm').ymd).toBe('2026-06-08'); // time stripped
  });
});

describe('windowFromDates — Monday–Sunday week alignment', () => {
  it('snaps a partial week to its Mon–Sun bounds', () => {
    // Jun 9 (Tue) – Jun 12 (Fri) 2026 → week is Jun 8 (Mon) – Jun 14 (Sun)
    const w = windowFromDates(['6/9/2026', '6/12/2026'], { weekAlign: true });
    expect(w.start).toBe('2026-06-08');
    expect(w.end).toBe('2026-06-14');
  });

  it('keeps an exact Mon–Sun week unchanged', () => {
    const w = windowFromDates(['2026-06-08', '2026-06-14'], { weekAlign: true });
    expect(w.start).toBe('2026-06-08');
    expect(w.end).toBe('2026-06-14');
  });

  it('without weekAlign returns the raw min/max', () => {
    const w = windowFromDates(['6/9/2026', '6/12/2026']);
    expect(w.start).toBe('2026-06-09');
    expect(w.end).toBe('2026-06-12');
  });
});
