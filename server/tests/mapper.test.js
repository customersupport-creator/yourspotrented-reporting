import { classify, validateMapping, mapRows, MappingError } from '../src/services/mapper.js';
import { defaultConfig } from '../src/config/defaultMapping.js';
import { normalizedSample } from './fixtures.js';

describe('classify', () => {
  it('matches keywords case-insensitively', () => {
    expect(classify('Towed', ['towed', 'tow'])).toBe(true);
    expect(classify('  TOW ', ['towed', 'tow'])).toBe(true);
  });

  it('returns false for blanks and non-matches', () => {
    expect(classify('', ['towed'])).toBe(false);
    expect(classify('unpaid', ['paid'])).toBe(false);
    expect(classify(undefined, ['paid'])).toBe(false);
  });

  it('matches a keyword as a whole word inside a longer value', () => {
    expect(classify('Vehicle Towed', ['towed', 'tow'])).toBe(true);
    expect(classify('Towed - 2026-06-01', ['towed'])).toBe(true);
    expect(classify('Fully Paid', ['paid'])).toBe(true);
  });

  it('does NOT match a keyword embedded in another word', () => {
    expect(classify('Unpaid', ['paid'])).toBe(false);
    expect(classify('Untowed', ['towed'])).toBe(false);
  });

  it('does NOT match a negated value', () => {
    expect(classify('Not Towed', ['towed', 'tow'])).toBe(false);
    expect(classify('No Tow', ['tow'])).toBe(false);
    // negation must be adjacent — this is still a tow
    expect(classify('No parking - towed', ['towed'])).toBe(true);
  });

  it('matches multi-word / hyphenated keywords', () => {
    expect(classify('Approved-Pending', ['approved-pending'])).toBe(true);
    expect(classify('Approved Pending', ['approved-pending'])).toBe(true);
  });

  it('supports the <datetime> sentinel for timestamp columns', () => {
    const rule = ['towed', 'tow', '<datetime>'];
    expect(classify('2026-06-01 14:30', rule)).toBe(true);
    expect(classify('06/01/2026', rule)).toBe(true);
    expect(classify('2:30 PM', rule)).toBe(true);
    expect(classify('', rule)).toBe(false); // blank = not towed
    expect(classify('1234', rule)).toBe(false); // a plain number is not a date/time
  });

  it('supports the * (any non-empty) sentinel with negation guard', () => {
    expect(classify('anything', ['*'])).toBe(true);
    expect(classify('Not Towed', ['*'])).toBe(false);
  });
});

describe('validateMapping', () => {
  it('passes when required columns are present', () => {
    const headers = Object.values(defaultConfig.columnMap);
    expect(() => validateMapping(headers, defaultConfig)).not.toThrow();
  });

  it('throws a 422 MappingError listing missing required columns', () => {
    const headers = ['Payment Status']; // missing the required "Date" column
    try {
      validateMapping(headers, defaultConfig);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MappingError);
      expect(err.status).toBe(422);
      expect(err.details.missingFields).toContain('date');
    }
  });
});

describe('mapRows', () => {
  it('normalizes rows by logical field name', () => {
    const { rows } = normalizedSample();
    expect(rows[0]).toMatchObject({ violationStatus: 'Encoded', paymentStatus: 'Paid', netRemitAmount: 1350 });
  });

  it('coerces non-numeric amounts to 0 and records a warning', () => {
    const raw = [{ 'Net Remit': 'abc', 'Violation Status': 'Encoded', Date: '2026-06-01' }];
    const { rows, warnings } = mapRows(raw, defaultConfig);
    expect(rows[0].netRemitAmount).toBe(0);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/non-numeric/);
  });
});
